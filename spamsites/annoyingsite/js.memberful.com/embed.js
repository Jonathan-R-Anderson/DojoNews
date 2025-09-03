/*
 * pmrpc 0.7.1 - Inter-widget remote procedure call library based on HTML5
 *               postMessage API and JSON-RPC. https://github.com/izuzak/pmrpc
 *
 * Copyright 2012 Ivan Zuzak, Marko Ivankovic
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

pmrpc = self.pmrpc =  function() {
  // check if JSON library is available
  if (typeof JSON === "undefined" || typeof JSON.stringify === "undefined" ||
      typeof JSON.parse === "undefined") {
    throw "pmrpc requires the JSON library";
  }

  // TODO: make "contextType" private variable
  // check if postMessage APIs are available
  if (typeof this.postMessage === "undefined" &&  // window or worker
        typeof this.onconnect === "undefined") {  // shared worker
      throw "pmrpc requires the HTML5 cross-document messaging and worker APIs";
  }

  // Generates a version 4 UUID
  function generateUUID() {
    var uuid = [], nineteen = "89AB", hex = "0123456789ABCDEF";
    for (var i=0; i<36; i++) {
      uuid[i] = hex[Math.floor(Math.random() * 16)];
    }
    uuid[14] = '4';
    uuid[19] = nineteen[Math.floor(Math.random() * 4)];
    uuid[8] = uuid[13] = uuid[18] = uuid[23] = '-';
    return uuid.join('');
  }

  // Checks whether a domain satisfies the access control list. The access
  // control list has a whitelist and a blacklist. In order to satisfy the acl,
  // the domain must be on the whitelist, and must not be on the blacklist.
  function checkACL(accessControlList, origin) {
    var aclWhitelist = accessControlList.whitelist;
    var aclBlacklist = accessControlList.blacklist;

    var isWhitelisted = false;
    var isBlacklisted = false;

    for (var i=0; i<aclWhitelist.length; ++i) {
      if(origin.match(new RegExp(aclWhitelist[i]))) {
        isWhitelisted = true;
        break;
      }
    }

    for (var j=0; j<aclBlacklist.length; ++j) {
      if(origin.match(new RegExp(aclBlacklist[j]))) {
        isBlacklisted = true;
        break;
      }
    }

    return isWhitelisted && !isBlacklisted;
  }

  // Calls a function with either positional or named parameters
  // In either case, additionalParams will be appended to the end
  function invokeProcedure(fn, self, params, additionalParams) {
    if (!(params instanceof Array)) {
      // get string representation of function
      var fnDef = fn.toString();

      // parse the string representation and retrieve order of parameters
      var argNames = fnDef.substring(fnDef.indexOf("(")+1, fnDef.indexOf(")"));
      argNames = (argNames === "") ? [] : argNames.split(", ");

      var argIndexes = {};
      for (var i=0; i<argNames.length; i++) {
        argIndexes[argNames[i]] = i;
      }

      // construct an array of arguments from a dictionary
      var callParameters = [];
      for (var paramName in params) {
        if (typeof argIndexes[paramName] !== "undefined") {
          callParameters[argIndexes[paramName]] = params[paramName];
        } else {
          throw "No such param: " + paramName;
        }
      }

      params = callParameters;
    }

    // append additional parameters
    if (typeof additionalParams !== "undefined") {
      params = params.concat(additionalParams);
    }

    // invoke function with specified context and arguments array
    return fn.apply(self, params);
  }

  // JSON encode an object into pmrpc message
  function encode(obj) {
    return "pmrpc." + JSON.stringify(obj);
  }

  // JSON decode a pmrpc message
  function decode(str) {
    return JSON.parse(str.substring("pmrpc.".length));
  }

  // Creates a base JSON-RPC object, usable for both request and response.
  // As of JSON-RPC 2.0 it only contains one field "jsonrpc" with value "2.0"
  function createJSONRpcBaseObject() {
    var call = {};
    call.jsonrpc = "2.0";
    return call;
  }

  // Creates a JSON-RPC request object for the given method and parameters
  function createJSONRpcRequestObject(procedureName, parameters, id) {
    var call = createJSONRpcBaseObject();
    call.method = procedureName;
    call.params = parameters;
    if (typeof id !== "undefined") {
      call.id = id;
    }
    return call;
  }

  // Creates a JSON-RPC error object complete with message and error code
  function createJSONRpcErrorObject(errorcode, message, data) {
    var error = {};
    error.code = errorcode;
    error.message = message;
    error.data = data;
    return error;
  }

  // Creates a JSON-RPC response object.
  function createJSONRpcResponseObject(error, result, id) {
    var response = createJSONRpcBaseObject();
    response.id = id;

    if (typeof error === "undefined" || error === null) {
      response.result = (result === "undefined") ? null : result;
    } else {
      response.error = error;
    }

    return response;
  }

  // dictionary of services registered for remote calls
  var registeredServices = {};
  // dictionary of requests being processed on the client side
  var callQueue = {};

  var reservedProcedureNames = {};
  // register a service available for remote calls
  // if no acl is given, assume that it is available to everyone
  function register(config) {
    if (config.publicProcedureName in reservedProcedureNames) {
      return false;
    } else {
      registeredServices[config.publicProcedureName] = {
        "publicProcedureName" : config.publicProcedureName,
        "procedure" : config.procedure,
        "context" : config.procedure.context,
        "isAsync" : typeof config.isAsynchronous !== "undefined" ?
                      config.isAsynchronous : false,
        "acl" : typeof config.acl !== "undefined" ?
                  config.acl : {whitelist: ["(.*)"], blacklist: []}};
      return true;
    }
  }

  // unregister a previously registered procedure
  function unregister(publicProcedureName) {
    if (publicProcedureName in reservedProcedureNames) {
      return false;
    } else {
      delete registeredServices[publicProcedureName];
      return true;
    }
  }

  // retreive service for a specific procedure name
  function fetchRegisteredService(publicProcedureName){
    return registeredServices[publicProcedureName];
  }

  // receive and execute a pmrpc call which may be a request or a response
  function processPmrpcMessage(eventParams) {
    var serviceCallEvent = eventParams.event;
    var eventSource = eventParams.source;
    var isWorkerComm = typeof eventSource !== "undefined" && eventSource !== null;

    // if the message is not for pmrpc, ignore it.
    if (typeof serviceCallEvent.data != "string" || serviceCallEvent.data.indexOf("pmrpc.") !== 0) {
      return;
    } else {
      var message = decode(serviceCallEvent.data);

      if (typeof message.method !== "undefined") {
        // this is a request

        var newServiceCallEvent = {
          data : serviceCallEvent.data,
          source : isWorkerComm ? eventSource : serviceCallEvent.source,
          origin : isWorkerComm ? "*" : serviceCallEvent.origin,
          shouldCheckACL : !isWorkerComm
        };

        var response = processJSONRpcRequest(message, newServiceCallEvent);

        // return the response
        if (response !== null) {
          sendPmrpcMessage(
            newServiceCallEvent.source, response, newServiceCallEvent.origin);
        }
      } else {
        // this is a response
        processJSONRpcResponse(message);
      }
    }
  }

  // Process a single JSON-RPC Request
  function processJSONRpcRequest(request, serviceCallEvent, shouldCheckACL) {
    if (request.jsonrpc !== "2.0") {
      // Invalid JSON-RPC request
      return createJSONRpcResponseObject(
        createJSONRpcErrorObject(-32600, "Invalid request.",
          "The recived JSON is not a valid JSON-RPC 2.0 request."),
        null,
        null);
    }

    var id = request.id;
    var service = fetchRegisteredService(request.method);

    if (typeof service !== "undefined") {
      // check the acl rights
      if (!serviceCallEvent.shouldCheckACL ||
            checkACL(service.acl, serviceCallEvent.origin)) {
        try {
          if (service.isAsync) {
            // if the service is async, create a callback which the service
            // must call in order to send a response back
            var cb = function (returnValue) {
                       sendPmrpcMessage(
                         serviceCallEvent.source,
                         createJSONRpcResponseObject(null, returnValue, id),
                         serviceCallEvent.origin);
                     };
             // create a errorback which the service
             // must call in order to send an error back
             var eb = function (errorValue) {
                 sendPmrpcMessage(
                   serviceCallEvent.source,
                   createJSONRpcResponseObject(
                		   createJSONRpcErrorObject(
                		     -1, "Application error.",errorValue.message),
                		   null, id),
                   serviceCallEvent.origin);
               };
            invokeProcedure(
              service.procedure, service.context, request.params, [cb, eb, serviceCallEvent]);
            return null;
          } else {
            // if the service is not async, just call it and return the value
            var returnValue = invokeProcedure(
                                service.procedure,
                                service.context,
                                request.params, [serviceCallEvent]);
            return (typeof id === "undefined") ? null :
              createJSONRpcResponseObject(null, returnValue, id);
          }
        } catch (error) {
          if (typeof id === "undefined") {
            // it was a notification nobody cares if it fails
            return null;
          }

          if (error.message.match("^(No such param)")) {
            return createJSONRpcResponseObject(
              createJSONRpcErrorObject(
                -32602, "Invalid params.", error.message),
              null,
              id);
          }

          // the -1 value is "application defined"
          return createJSONRpcResponseObject(
            createJSONRpcErrorObject(
              -1, "Application error.", error.message),
            null,
            id);
        }
      } else {
        // access denied
        return (typeof id === "undefined") ? null : createJSONRpcResponseObject(
          createJSONRpcErrorObject(
            -2, "Application error.", "Access denied on server."),
          null,
          id);
      }
    } else {
      // No such method
      return (typeof id === "undefined") ? null : createJSONRpcResponseObject(
        createJSONRpcErrorObject(
          -32601,
          "Method not found.",
          "The requestd remote procedure does not exist or is not available."),
        null,
        id);
    }
  }

  // internal rpc service that receives responses for rpc calls
  function processJSONRpcResponse(response) {
    var id = response.id;
    var callObj = callQueue[id];
    if (typeof callObj === "undefined" || callObj === null) {
      return;
    } else {
      delete callQueue[id];
    }

    // check if the call was sucessful or not
    if (typeof response.error === "undefined") {
      callObj.onSuccess( {
        "destination" : callObj.destination,
        "publicProcedureName" : callObj.publicProcedureName,
        "params" : callObj.params,
        "status" : "success",
        "returnValue" : response.result} );
    } else {
      callObj.onError( {
        "destination" : callObj.destination,
        "publicProcedureName" : callObj.publicProcedureName,
        "params" : callObj.params,
        "status" : "error",
        "message" : response.error.message + " " + response.error.data} );
    }
  }

  // call remote procedure
  function call(config) {
    // check that number of retries is not -1, that is a special internal value
    if (config.retries && config.retries < 0) {
      throw new Exception("number of retries must be 0 or higher");
    }

    var destContexts = [];

    if (typeof config.destination === "undefined" || config.destination === null || config.destination === "workerParent") {
      destContexts = [{context : null, type : "workerParent"}];
    } else if (config.destination === "publish") {
      destContexts = findAllReachableContexts();
    } else if (config.destination instanceof Array) {
      for (var i=0; i<config.destination.length; i++) {
        if (config.destination[i] === "workerParent") {
          destContexts.push({context : null, type : "workerParent"});
        } else if (typeof config.destination[i].frames !== "undefined") {
          destContexts.push({context : config.destination[i], type : "window"});
        } else {
          destContexts.push({context : config.destination[i], type : "worker"});
        }
      }
    } else {
      if (typeof config.destination.frames !== "undefined") {
        destContexts.push({context : config.destination, type : "window"});
      } else {
        destContexts.push({context : config.destination, type : "worker"});
      }
    }

    for (var i=0; i<destContexts.length; i++) {
      var callObj = {
        destination : destContexts[i].context,
        destinationDomain : typeof config.destinationDomain === "undefined" ? ["*"] : (typeof config.destinationDomain === "string" ? [config.destinationDomain] : config.destinationDomain),
        publicProcedureName : config.publicProcedureName,
        onSuccess : typeof config.onSuccess !== "undefined" ?
                      config.onSuccess : function (){},
        onError : typeof config.onError !== "undefined" ?
                      config.onError : function (){},
        retries : typeof config.retries !== "undefined" ? config.retries : 5,
        timeout : typeof config.timeout !== "undefined" ? config.timeout : 500,
        status : "requestNotSent"
      };

      isNotification = typeof config.onError === "undefined" && typeof config.onSuccess === "undefined";
      params = (typeof config.params !== "undefined") ? config.params : [];
      callId = generateUUID();
      callQueue[callId] = callObj;

      if (isNotification) {
        callObj.message = createJSONRpcRequestObject(
                    config.publicProcedureName, params);
      } else {
        callObj.message = createJSONRpcRequestObject(
                            config.publicProcedureName, params, callId);
      }

      waitAndSendRequest(callId);
    }
  }

  // Use the postMessage API to send a pmrpc message to a destination
  function sendPmrpcMessage(destination, message, acl) {
    if (typeof destination === "undefined" || destination === null) {
      self.postMessage(encode(message));
    } else if (typeof destination.frames !== "undefined") {
      return destination.postMessage(encode(message), acl);
    } else {
      destination.postMessage(encode(message));
    }
  }

  // Execute a remote call by first pinging the destination and afterwards
  // sending the request
  function waitAndSendRequest(callId) {
    var callObj = callQueue[callId];
    if (typeof callObj === "undefined") {
      return;
    } else if (callObj.retries <= -1) {
      processJSONRpcResponse(
        createJSONRpcResponseObject(
          createJSONRpcErrorObject(
          -4, "Application error.", "Destination unavailable."),
          null,
          callId));
    } else if (callObj.status === "requestSent") {
      return;
    } else if (callObj.retries === 0 || callObj.status === "available") {
      callObj.status = "requestSent";
      callObj.retries = -1;
      callQueue[callId] = callObj;
      for (var i=0; i<callObj.destinationDomain.length; i++) {
        sendPmrpcMessage(
          callObj.destination, callObj.message, callObj.destinationDomain[i], callObj);
        self.setTimeout(function() { waitAndSendRequest(callId); }, callObj.timeout);
      }
    } else {
      // if we can ping some more - send a new ping request
      callObj.status = "pinging";
      var retries = callObj.retries;
      callObj.retries = retries - 1;

      call({
        "destination" : callObj.destination,
        "publicProcedureName" : "receivePingRequest",
        "onSuccess" : function (callResult) {
                        if (callResult.returnValue === true &&
                            typeof callQueue[callId] !== 'undefined') {
                          callQueue[callId].status = "available";
                          waitAndSendRequest(callId);
                        }
                      },
        "params" : [callObj.publicProcedureName],
        "retries" : 0,
        "destinationDomain" : callObj.destinationDomain});
      callQueue[callId] = callObj;
      self.setTimeout(function() {
        if (callQueue[callId] && callQueue[callId].status === "pinging") {
          waitAndSendRequest(callId);
        }
      }, callObj.timeout / retries);
    }
  }

  // attach the pmrpc event listener
  function addCrossBrowserEventListerner(obj, eventName, handler, bubble) {
    if ("addEventListener" in obj) {
      // FF
      obj.addEventListener(eventName, handler, bubble);
    } else {
      // IE
      obj.attachEvent("on" + eventName, handler);
    }
  }

  function createHandler(method, source, destinationType) {
    return function(event) {
      var params = {event : event, source : source, destinationType : destinationType};
      method(params);
    };
  }

  if ('window' in this) {
    // window object - window-to-window comm
    var handler = createHandler(processPmrpcMessage, null, "window");
    addCrossBrowserEventListerner(this, "message", handler, false);
  } else if ('onmessage' in this) {
    // dedicated worker - parent X to worker comm
    var handler = createHandler(processPmrpcMessage, this, "worker");
    addCrossBrowserEventListerner(this, "message", handler, false);
  } else if ('onconnect' in this) {
    // shared worker - parent X to shared-worker comm
    var connectHandler = function(e) {
      //this.sendPort = e.ports[0];
      var handler = createHandler(processPmrpcMessage, e.ports[0], "sharedWorker");
      addCrossBrowserEventListerner(e.ports[0], "message", handler, false);
      e.ports[0].start();
    };
    addCrossBrowserEventListerner(this, "connect", connectHandler, false);
  } else {
    throw "Pmrpc must be loaded within a browser window or web worker.";
  }

  // Override Worker and SharedWorker constructors so that pmrpc may relay
  // messages. For each message received from the worker, call pmrpc processing
  // method. This is child worker to parent communication.

  var createDedicatedWorker = this.Worker;
  this.nonPmrpcWorker = createDedicatedWorker;
  var createSharedWorker = this.SharedWorker;
  this.nonPmrpcSharedWorker = createSharedWorker;

  var allWorkers = [];

  this.Worker = function(scriptUri) {
    var newWorker = new createDedicatedWorker(scriptUri);
    allWorkers.push({context : newWorker, type : 'worker'});
    var handler = createHandler(processPmrpcMessage, newWorker, "worker");
    addCrossBrowserEventListerner(newWorker, "message", handler, false);
    return newWorker;
  };

  this.SharedWorker = function(scriptUri, workerName) {
    var newWorker = new createSharedWorker(scriptUri, workerName);
    allWorkers.push({context : newWorker, type : 'sharedWorker'});
    var handler = createHandler(processPmrpcMessage, newWorker.port, "sharedWorker");
    addCrossBrowserEventListerner(newWorker.port, "message", handler, false);
    newWorker.postMessage = function (msg, portArray) {
      return newWorker.port.postMessage(msg, portArray);
    };
    newWorker.port.start();
    return newWorker;
  };

  // function that receives pings for methods and returns responses
  function receivePingRequest(publicProcedureName) {
    return typeof fetchRegisteredService(publicProcedureName) !== "undefined";
  }

  function subscribe(params) {
    return register(params);
  }

  function unsubscribe(params) {
    return unregister(params);
  }

  function findAllWindows() {
    var allWindowContexts = [];

    if (typeof window !== 'undefined') {
      allWindowContexts.push( { context : window.top, type : 'window' } );

      // walk through all iframes, starting with window.top
      for (var i=0; typeof allWindowContexts[i] !== 'undefined'; i++) {
        var currentWindow = allWindowContexts[i];
        for (var j=0; j<currentWindow.context.frames.length; j++) {
          allWindowContexts.push({
            context : currentWindow.context.frames[j],
            type : 'window'
          });
        }
      }
    } else {
      allWindowContexts.push( {context : this, type : 'workerParent'} );
    }

    return allWindowContexts;
  }

  function findAllWorkers() {
    return allWorkers;
  }

  function findAllReachableContexts() {
    var allWindows = findAllWindows();
    var allWorkers = findAllWorkers();
    var allContexts = allWindows.concat(allWorkers);

    return allContexts;
  }

  // register method for receiving and returning pings
  register({
    "publicProcedureName" : "receivePingRequest",
    "procedure" : receivePingRequest});

  function getRegisteredProcedures() {
    var regSvcs = [];
    var origin = typeof this.frames !== "undefined" ? (window.location.protocol + "//" + window.location.host + (window.location.port !== "" ? ":" + window.location.port : "")) : "";
    for (var publicProcedureName in registeredServices) {
      if (publicProcedureName in reservedProcedureNames) {
        continue;
      } else {
        regSvcs.push( {
          "publicProcedureName" : registeredServices[publicProcedureName].publicProcedureName,
          "acl" : registeredServices[publicProcedureName].acl,
          "origin" : origin
        } );
      }
    }
    return regSvcs;
  }

  // register method for returning registered procedures
  register({
    "publicProcedureName" : "getRegisteredProcedures",
    "procedure" : getRegisteredProcedures});

  function discover(params) {
    var windowsForDiscovery = null;

    if (typeof params.destination === "undefined") {
      windowsForDiscovery = findAllReachableContexts();
      for (var i=0; i<windowsForDiscovery.length; i++) {
        windowsForDiscovery[i] = windowsForDiscovery[i].context;
      }
    } else {
      windowsForDiscovery = params.destination;
    }
    var originRegex = typeof params.originRegex === "undefined" ?
      "(.*)" : params.originRegex;
    var nameRegex = typeof params.nameRegex === "undefined" ?
      "(.*)" : params.nameRegex;

    var counter = windowsForDiscovery.length;

    var discoveredMethods = [];
    function addToDiscoveredMethods(methods, destination) {
      for (var i=0; i<methods.length; i++) {
        if (methods[i].origin.match(new RegExp(originRegex)) &&
            methods[i].publicProcedureName.match(new RegExp(nameRegex))) {
          discoveredMethods.push({
            publicProcedureName : methods[i].publicProcedureName,
            destination : destination,
            procedureACL : methods[i].acl,
            destinationOrigin : methods[i].origin
          });
        }
      }
    }

    pmrpc.call({
      destination : windowsForDiscovery,
      destinationDomain : "*",
      publicProcedureName : "getRegisteredProcedures",
      onSuccess : function (callResult) {
                    counter--;
                    addToDiscoveredMethods(callResult.returnValue, callResult.destination);
                    if (counter === 0) {
                      params.callback(discoveredMethods);
                    }
                  },
      onError : function (callResult) {
                  counter--;
                  if (counter === 0) {
                    params.callback(discoveredMethods);
                  }
                }
    });
  }

  reservedProcedureNames = {"getRegisteredProcedures" : null, "receivePingRequest" : null};

  // return public methods
  return {
    register : register,
    unregister : unregister,
    call : call,
    discover : discover
  };
}();

//AMD suppport
if (typeof define == 'function' && define.amd) {
	define("pmrpc", pmrpc);
};
(function() {
  this.Memberful || (this.Memberful = {});

  this.Memberful.setup = function(options) {
    Memberful.sites = function() {
      if (Array.isArray(options.site)) {
        return options.site;
      } else {
        return [options.site];
      }
    };
    return Memberful.ready(function() {
      var elementInterceptor, overlayController;
      new Memberful.UserTracker().setup();
      elementInterceptor = new Memberful.ElementInterceptor;
      if (!elementInterceptor.hasElementsToIntercept()) {
        Memberful.debug("Memberful: No links to intercept, quitting.");
        return;
      }
      if (!Memberful.detectOverlaySupport()) {
        Memberful.debug("Memberful: Overlay is not activated because of unsupported device.");
        return;
      }
      if (options.disableOverlay) {
        Memberful.debug("Memberful: Overlay has been disabled.");
        return;
      }
      overlayController = new Memberful.OverlayController();
      return elementInterceptor.interceptElements(overlayController);
    });
  };

  if (this.MemberfulOptions != null) {
    this.MemberfulEmbedded || (this.MemberfulEmbedded = {});
    this.MemberfulEmbedded.setup = (function(_this) {
      return function() {
        return Memberful.setup(_this.MemberfulOptions);
      };
    })(this);
  }

}).call(this);
(function() {
  Memberful.debug = function(message) {
    return console.log(message);
  };

}).call(this);
(function(global) {
  var apple_phone = /iPhone/i,
    apple_ipod = /iPod/i,
    apple_tablet = /iPad/i,
    android_phone = /\bAndroid(?:.+)Mobile\b/i, // Match 'Android' AND 'Mobile'
    android_tablet = /Android/i,
    amazon_phone = /\bAndroid(?:.+)SD4930UR\b/i,
    amazon_tablet = /\bAndroid(?:.+)(?:KF[A-Z]{2,4})\b/i,
    windows_phone = /Windows Phone/i,
    windows_tablet = /\bWindows(?:.+)ARM\b/i, // Match 'Windows' AND 'ARM'
    other_blackberry = /BlackBerry/i,
    other_blackberry_10 = /BB10/i,
    other_opera = /Opera Mini/i,
    other_chrome = /\b(CriOS|Chrome)(?:.+)Mobile/i,
    other_firefox = /Mobile(?:.+)Firefox\b/i; // Match 'Mobile' AND 'Firefox'

  function match(regex, userAgent) {
    return regex.test(userAgent);
  }

  function isMobile(userAgent) {
    var ua =
      userAgent ||
      (typeof navigator !== 'undefined' ? navigator.userAgent : '');

    // Facebook mobile app's integrated browser adds a bunch of strings that
    // match everything. Strip it out if it exists.
    var tmp = ua.split('[FBAN');
    if (typeof tmp[1] !== 'undefined') {
      ua = tmp[0];
    }

    // Twitter mobile app's integrated browser on iPad adds a "Twitter for
    // iPhone" string. Same probably happens on other tablet platforms.
    // This will confuse detection so strip it out if it exists.
    tmp = ua.split('Twitter');
    if (typeof tmp[1] !== 'undefined') {
      ua = tmp[0];
    }

    var result = {
      apple: {
        phone: match(apple_phone, ua) && !match(windows_phone, ua),
        ipod: match(apple_ipod, ua),
        tablet:
          !match(apple_phone, ua) &&
          match(apple_tablet, ua) &&
          !match(windows_phone, ua),
        device:
          (match(apple_phone, ua) ||
            match(apple_ipod, ua) ||
            match(apple_tablet, ua)) &&
          !match(windows_phone, ua)
      },
      amazon: {
        phone: match(amazon_phone, ua),
        tablet: !match(amazon_phone, ua) && match(amazon_tablet, ua),
        device: match(amazon_phone, ua) || match(amazon_tablet, ua)
      },
      android: {
        phone:
          (!match(windows_phone, ua) && match(amazon_phone, ua)) ||
          (!match(windows_phone, ua) && match(android_phone, ua)),
        tablet:
          !match(windows_phone, ua) &&
          !match(amazon_phone, ua) &&
          !match(android_phone, ua) &&
          (match(amazon_tablet, ua) || match(android_tablet, ua)),
        device:
          (!match(windows_phone, ua) &&
            (match(amazon_phone, ua) ||
              match(amazon_tablet, ua) ||
              match(android_phone, ua) ||
              match(android_tablet, ua))) ||
          match(/\bokhttp\b/i, ua)
      },
      windows: {
        phone: match(windows_phone, ua),
        tablet: match(windows_tablet, ua),
        device: match(windows_phone, ua) || match(windows_tablet, ua)
      },
      other: {
        blackberry: match(other_blackberry, ua),
        blackberry10: match(other_blackberry_10, ua),
        opera: match(other_opera, ua),
        firefox: match(other_firefox, ua),
        chrome: match(other_chrome, ua),
        device:
          match(other_blackberry, ua) ||
          match(other_blackberry_10, ua) ||
          match(other_opera, ua) ||
          match(other_firefox, ua) ||
          match(other_chrome, ua)
      }
    };
    (result.any =
      result.apple.device ||
      result.android.device ||
      result.windows.device ||
      result.other.device),
      // excludes 'other' devices and ipods, targeting touchscreen phones
      (result.phone =
        result.apple.phone || result.android.phone || result.windows.phone),
      (result.tablet =
        result.apple.tablet || result.android.tablet || result.windows.tablet);

    return result;
  }

  if (
    typeof module !== 'undefined' &&
    module.exports &&
    typeof window === 'undefined'
  ) {
    // Node.js
    module.exports = isMobile;
  } else if (
    typeof module !== 'undefined' &&
    module.exports &&
    typeof window !== 'undefined'
  ) {
    // Browserify
    module.exports = isMobile();
    module.exports.isMobile = isMobile;
  } else if (typeof define === 'function' && define.amd) {
    // AMD
    define([], (global.isMobile = isMobile()));
  } else {
    global.isMobile = isMobile();
  }
})(Memberful);
(function() {
  Memberful.OVERLAY_PATHS = new RegExp("^/(account(?!/discord|/discourse|/downloads/get|/spotify)|auth|checkout|gift|register)", "i");

  Memberful.detectSupport = function() {
    return typeof window.URLSearchParams === "function";
  };

  Memberful.detectOverlaySupport = function() {
    return Memberful.notInIframe() && Memberful.isSupportedDevice() && Memberful.isChrome();
  };

  Memberful.inIframe = function() {
    return window.top !== window.self;
  };

  Memberful.notInIframe = function() {
    return !Memberful.inIframe();
  };

  Memberful.isSupportedDevice = function() {
    if (Memberful.isMobile.phone) {
      return false;
    }
    return true;
  };

  Memberful.isChrome = function() {
    return navigator.userAgent.match(/Chrome/) && navigator.brave === void 0;
  };

  Memberful.ready = function(fn) {
    if (Memberful.detectSupport()) {
      if (/complete|loaded|interactive/.test(document.readyState) && document.body) {
        return fn();
      } else {
        return document.addEventListener('DOMContentLoaded', fn, false);
      }
    }
  };

  Memberful.testCheckoutUrl = function(url) {
    url = new URL(url);
    return Memberful.testMemberfulUrl(url) && url.pathname === "/checkout";
  };

  Memberful.testCheckoutForm = function(form) {
    return form.method === "get" && Memberful.testCheckoutUrl(form.action);
  };

  Memberful.testInterceptUrl = function(url) {
    return Memberful.testOverlayUrl(url) || Memberful.testWordpressLoginUrl(url);
  };

  Memberful.testLogoutUrl = function(url) {
    url = new URL(url);
    return Memberful.testMemberfulUrl(url.href) && url.pathname === "/auth/sign_out";
  };

  Memberful.testMemberfulUrl = function(url) {
    url = new URL(url);
    return Memberful.sites().some((function(_this) {
      return function(site) {
        return site.startsWith(url.origin);
      };
    })(this));
  };

  Memberful.testOverlayUrl = function(url) {
    url = new URL(url);
    return Memberful.testMemberfulUrl(url.href) && Memberful.OVERLAY_PATHS.test(url.pathname);
  };

  Memberful.testWordpressLoginUrl = function(url) {
    url = new URL(url);
    return url.hostname === window.location.hostname && url.searchParams.get("memberful_endpoint") === "auth";
  };

}).call(this);
(function() {
  Memberful.TrackingParameters = (function() {
    var LOCAL_STORAGE_KEY;

    function TrackingParameters() {}

    LOCAL_STORAGE_KEY = "memberful_tracking_params";

    TrackingParameters.prototype.set = function(name, value) {
      var trackingParams;
      trackingParams = this.getAll();
      trackingParams[name] = value;
      return localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(trackingParams));
    };

    TrackingParameters.prototype.get = function(name) {
      return this.getAll()[name];
    };

    TrackingParameters.prototype.getAll = function() {
      return JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY)) || {};
    };

    return TrackingParameters;

  })();

}).call(this);
(function() {
  var CUSTOM_PARAMETER_PREFIX, DEFAULT_TRACKING_PARAMETERS, isCustomParameter, urlParameterName,
    indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

  CUSTOM_PARAMETER_PREFIX = "mt_";

  DEFAULT_TRACKING_PARAMETERS = ["referral_code", "referrer", "utm_campaign", "utm_content", "utm_medium", "utm_source", "utm_term"];

  Memberful.addTrackingParamsToLink = function(link) {
    var name, trackingParameters, url, value;
    trackingParameters = new Memberful.TrackingParameters().getAll();
    if (typeof memberfulTrackingData !== "undefined" && memberfulTrackingData !== null) {
      trackingParameters = memberfulTrackingData(trackingParameters);
    }
    url = new URL(link.href);
    for (name in trackingParameters) {
      value = trackingParameters[name];
      if (value.length > 0) {
        url.searchParams.set(urlParameterName(name), value.substring(0, 200));
      }
    }
    return link.href = url.href;
  };

  urlParameterName = function(name) {
    if (isCustomParameter(name)) {
      return CUSTOM_PARAMETER_PREFIX + name;
    } else {
      return name;
    }
  };

  isCustomParameter = function(parameter) {
    return indexOf.call(DEFAULT_TRACKING_PARAMETERS, parameter) < 0;
  };

}).call(this);
(function() {
  Memberful.UserTracker = (function() {
    var URL_PARAMETERS_TO_TRACK;

    URL_PARAMETERS_TO_TRACK = ["referral_code", "utm_campaign", "utm_content", "utm_medium", "utm_source", "utm_term"];

    function UserTracker() {
      this.trackingParameters = new Memberful.TrackingParameters();
    }

    UserTracker.prototype.setup = function() {
      this.storeTrackingParameters();
      return this.addTrackingParametersToMemberfulLinks();
    };

    UserTracker.prototype.storeTrackingParameters = function() {
      var i, len, results, urlParameter;
      this.storeReferrer();
      results = [];
      for (i = 0, len = URL_PARAMETERS_TO_TRACK.length; i < len; i++) {
        urlParameter = URL_PARAMETERS_TO_TRACK[i];
        results.push(this.storeUrlParameter(urlParameter));
      }
      return results;
    };

    UserTracker.prototype.storeReferrer = function() {
      if (typeof this.trackingParameters.get("referrer") === "string") {
        return;
      }
      return this.trackingParameters.set("referrer", document.referrer);
    };

    UserTracker.prototype.storeUrlParameter = function(parameterName) {
      var value;
      if (value = this.getUrlParameterByName(parameterName)) {
        return this.trackingParameters.set(parameterName, value);
      }
    };

    UserTracker.prototype.getUrlParameterByName = function(name) {
      var url;
      url = new URL(location.href);
      return url.searchParams.get(name);
    };

    UserTracker.prototype.addTrackingParametersToMemberfulLinks = function() {
      var i, len, link, ref, results;
      ref = document.links;
      results = [];
      for (i = 0, len = ref.length; i < len; i++) {
        link = ref[i];
        if (Memberful.testMemberfulUrl(link.href)) {
          results.push(Memberful.addTrackingParamsToLink(link));
        }
      }
      return results;
    };

    return UserTracker;

  })();

}).call(this);
// https://github.com/github/form-data-entries

if (typeof FormData === 'function' && 'entries' in FormData.prototype) {
  Memberful.formDataEntries = function(form) {
    return Array.from(new FormData(form).entries())
  }
} else {
  Memberful.formDataEntries = function(form) {
    var entries = []

    var elements = form.elements
    for (var i = 0; i < elements.length; i++) {
      var el = elements[i]
      var tagName = el.tagName.toUpperCase()

      if (tagName === 'SELECT' || tagName === 'TEXTAREA' || tagName === 'INPUT') {
        var type = el.type,
          name = el.name

        if (
          name &&
          !el.disabled &&
          type !== 'submit' &&
          type !== 'reset' &&
          type !== 'button' &&
          ((type !== 'radio' && type !== 'checkbox') || el.checked)
        ) {
          if (tagName === 'SELECT') {
            var options = el.getElementsByTagName('option')
            for (var j = 0; j < options.length; j++) {
              var option = options[j]
              if (option.selected) {
                entries.push([name, option.value])
              }
            }
          } else if (type === 'file') {
            // eslint-disable-next-line no-console
            console.warn('form-data-entries could not serialize <input type=file>', el)
            entries.push([name, ''])
          } else {
            entries.push([name, el.value])
          }
        }
      }
    }

    return entries
  }
};
(function() {
  var bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

  Memberful.ElementInterceptor = (function() {
    function ElementInterceptor() {
      this.openUrl = bind(this.openUrl, this);
      this.openForm = bind(this.openForm, this);
      this.openLink = bind(this.openLink, this);
      this.links = this.interceptLinks();
      this.forms = this.interceptForms();
    }

    ElementInterceptor.prototype.hasElementsToIntercept = function() {
      return this.links.length > 0 || this.forms.length > 0;
    };

    ElementInterceptor.prototype.interceptElements = function(overlayController) {
      return this.overlayController = overlayController;
    };

    ElementInterceptor.prototype.interceptLinks = function() {
      var i, len, link, ref, results;
      ref = document.links;
      results = [];
      for (i = 0, len = ref.length; i < len; i++) {
        link = ref[i];
        if (!(Memberful.testInterceptUrl(link))) {
          continue;
        }
        Memberful.debug("Embedded.LinkInterceptor:intercepting-link " + link.href);
        results.push(link.addEventListener("click", this.openLink, false));
      }
      return results;
    };

    ElementInterceptor.prototype.interceptForms = function() {
      var form, i, len, ref, results;
      ref = document.forms;
      results = [];
      for (i = 0, len = ref.length; i < len; i++) {
        form = ref[i];
        if (!(Memberful.testCheckoutForm(form))) {
          continue;
        }
        Memberful.debug("Embedded.FormInterceptor:intercepting-form " + form.action);
        results.push(form.addEventListener("submit", this.openForm, false));
      }
      return results;
    };

    ElementInterceptor.prototype.openLink = function(event) {
      event.preventDefault();
      return this.openUrl(event.currentTarget.href);
    };

    ElementInterceptor.prototype.openForm = function(event) {
      var i, len, name, ref, ref1, url, value;
      event.preventDefault();
      url = new URL(event.currentTarget.action);
      ref = Memberful.formDataEntries(event.currentTarget);
      for (i = 0, len = ref.length; i < len; i++) {
        ref1 = ref[i], name = ref1[0], value = ref1[1];
        url.searchParams.append(name, value);
      }
      return this.openUrl(url);
    };

    ElementInterceptor.prototype.openUrl = function(url) {
      var referrer, target;
      target = new URL(url);
      referrer = new URL(window.location.href);
      if (this.overlayController) {
        referrer.hash = "memberful_overlay";
      }
      if (Memberful.testWordpressLoginUrl(target)) {
        target.searchParams.set("redirect_to", referrer);
      } else if (!target.searchParams.has("return_to")) {
        target.searchParams.set("return_to", referrer);
      }
      if (this.overlayController && !Memberful.testLogoutUrl(target)) {
        return this.overlayController.openUrl(target.href);
      } else {
        return window.location = target.href;
      }
    };

    return ElementInterceptor;

  })();

}).call(this);
(function() {
  Memberful.Rpc = (function() {
    function Rpc() {}

    Rpc.prototype.listen = function(procedure, callback) {
      Memberful.debug("Embedded.Rpc#listen(" + procedure + ")");
      return pmrpc.register({
        publicProcedureName: procedure,
        procedure: callback
      });
    };

    Rpc.prototype.call = function(procedure, params) {
      var frame, options, paramsForLog;
      if (params != null) {
        paramsForLog = params.join(", ");
      } else {
        paramsForLog = "";
      }
      Memberful.debug("Embedded.Rpc#call(" + procedure + ", [" + paramsForLog + "])");
      frame = document.getElementById("memberful-iframe-for-overlay");
      if (frame) {
        options = {};
        options.destination = frame.contentWindow;
        options.publicProcedureName = procedure;
        options.params = params;
        options.timeout = 2000;
        return pmrpc.call(options);
      } else {
        return Memberful.debug("Embedded.Rpc#call: Memberful iframe not found. Call aborted.");
      }
    };

    return Rpc;

  })();

}).call(this);
(function() {
  Memberful.MemberfulIframe = (function() {
    var IFRAME_ID;

    IFRAME_ID = "memberful-iframe-for-overlay";

    function MemberfulIframe(url) {
      this.rpc = new Memberful.Rpc;
      this.element = document.createElement('iframe');
      this.element.setAttribute("id", IFRAME_ID);
      this.element.setAttribute("frameBorder", "0");
      this.element.setAttribute("allowTransparency", true);
      this.element.setAttribute("allow", "clipboard-write; payment");
      this.element.style.cssText = 'position: fixed;\nleft: 0;\ntop: 0;\nright:0;\nbottom:0;\nwidth:100%;\nheight: 100%;\nz-index: 999999999999999;\ndisplay: block;\nbackground: transparent;\nborder: 0px none transparent;\noverflow: hidden;\nmargin: 0;\npadding: 0;\n-webkit-tap-highlight-color: transparent;\n-webkit-touch-callout: none;';
      this.element.src = url;
    }

    MemberfulIframe.prototype.show = function() {
      Memberful.debug("MemberfulIframe#show");
      return this.element.style.visibility = "visible";
    };

    MemberfulIframe.prototype.hide = function() {
      Memberful.debug("MemberfulIframe#hide");
      return this.element.style.visibility = "hidden";
    };

    MemberfulIframe.prototype.visit = function(url) {
      Memberful.debug("MemberfulIframe#visit(" + url + ")");
      return this.rpc.call("visit", [url]);
    };

    return MemberfulIframe;

  })();

}).call(this);
(function() {
  Memberful.Spinner = (function() {
    var DATA_URI, DELAY, FRAME_COUNT, SIZE, SPINNER_ID;

    DATA_URI = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAJgCAQAAABBtKk6AAAz2ElEQVR42s2dCXgUVbr309Vb9j3sOwmrbEYEF2QTwRVhiEZREJSAILIZ2YRWQMIiQiCAkSUSCJiQnZAdOum9zxJ0HEZmvOM23hmXO3fuOONdxueb%2Bd46tXa6qysxc7%2F5Uo%2FPY%2Bj0v6tOVZ%2FzO%2B%2F7P%2B%2BJiAj3Y46wwH%2FGiG7%2BGBQBepXWqQS4Lry5MKEtQ5awMgGT9PbW8SVJKvlQb68fQN%2FFBQdjxN%2BjmIBZ%2BGVLEq7FDS2Dwp5AphntoSXeJ8WTVQuYHWuJG52abtK5hJqx9AItOt%2B3k4ChIJ3aqbN%2BvNYlqBrOs5aW%2BNazplMErO4DxO2zqRo0QMjQ0DfLKP6T4Vg%2FXEQvNN0Gv0uNyFXdTV249Z2%2BUnNOj7ySoZI4HUcP4s3NGaK%2B0ZlFS1AeXK1FEJgeic8Tt3sZaxmQvXy3%2FzJxwx2RPr9lGH6THqcFvuUlqfwfrY5FR3FBQ98IKxzwKFUOxzWk%2FFAUf4FvD3MdJr%2FAN9F1h6o9DKtjXfPpERA57HjEFhnBlQ%2FbFKM6Rc4Wz5%2Ffi0nt6ynFNyl1r9sf17k5Te%2F0defQAnqc7G4cGOLxNTWPQ9fwTfIL7%2BELg0M%2F3oYIc91otA2%2FaYsO9bItkbTh8qYp4b8bhjEWeAZC32uuZmiOOfg1AyiaVIcxzCdERkRFxETEiUcM%2FA7PJUffDDwitB%2FWSPyvgQf%2Ft8ZuCFjwV4EHOwPWbVjFg%2B9AwgjAa%2Bq%2FNYXoIbKMLSmajTg2Mzp8p8I1DUXL8IvwKIX42ZtCPvX5r86Bhgz5AYZzKf4FJJfk0pya3iH%2BhGub5P%2BY%2FoD%2B4i09OQZOP%2FCnKNI7g26At69z3LM0EnqmNDgLRcRgs5QlwAMd69ru%2F5b%2BQP7gfHNjqupiWvuj1fDmV9yP5CXx%2F2yz4KfJ4hL%2B%2F%2FmnwtgUg6b7puXw%2FYKxeKivCP8ZzuRfmqfKEoXReC16pmqg2P4G1x1kBVoIX2eOZJGsCKON89%2BF57iGi%2BdkvjINOdAXpcmqS6hMUW7e%2BXi6jKyoGAB%2FLgpERLSk4DlkltzZGjLNbRlanRvnn01WeO5nD7QgwEsbfBPwHM%2B4LowMzf3ICrrshNDbKAIRxTF0dsf9cNphx4UIG0cWkBXuyeInqQQiDN4MPAdP0TmHuiT6LH56qfQgqQUicsz0vo7pTTE6l1AU2ao8RnIjCj8kodCscwmdenwDE%2BAifvKPgT1KPRAws6MnfEAu0zKt4Uzjzefjrw1X%2BIAJSM%2Booem2okQdPrjSH%2BXjg3K3HskERD5Yl4hLcSWMGeH5wP8aPeVfIPGBSsDkXEla%2FMd0%2BaByNH0XnbjYu5OA4cQwepU0szFblw9Wwjm8yJpOuQSrZzd8%2FhZNPmjtrfBBQR98nL7bPJofyMVGNFRPoc24VjwveELnWeuHqyTKYtEutA7%2BSeQDx%2BP0FNnJ84FwGwdHolOkxfWMyAeWy1PwedwKd0TmkyH4NXqQHvA%2BAx0L%2FFFWLNqPD9b1Yb0%2FjBM1Q%2FH7%2BPwGxgcHh3r2EYQxuWpXtYdhU4zrIZQHnLLXPZfng6ohcCtV34n9cfB0GJcmtq8hLnizy706N4gPjKd6e5bSAyCyvbV%2FiMfX2DAW1cGbkW%2FfpYGhvx%2BGCFP1SLwBv8ZONuhnXwJuwBfqJ%2BvwQab5Ym%2Btoa1ucGg%2B4FSEYGS%2FheOD6IhY8YiG3408H2wPPMIJ4E8CDwEwOguE44POAvwZqMZ8gQ5MYTqYrvBBY7JmI46eGqXDBy2DfE%2BR50LzgS0Z%2BLT96qyISA0%2BKEnyPkTWkDX02fq0EH9iujaBdNDv0Lee4uOjg%2FjAFum%2Bm66CN%2Be037nWCvSckm9Vo%2B7WtFp4gIAPXvV%2FQb%2FDX7lsa1JUF2Pvg5bBZ6%2F2zrElCnxAFtCFPFIIz0jbaPJb9C%2BL%2BOHceGGwpxB%2FQ78jH7VNliVKozqex4tKpW%2BAwTmBLMYP8T0Efhg%2FHGHMsvg66I%2Ftr0uTn7q7%2Fc341qnkgDFReXxOx6FssriCB15OEIBLup%2F%2BlfzH4ZFSp5Nptqdrdm6uaWSxb5rAB0yAfy7MvnL6o%2FdCRKTuwNDamyxG2YUJQuPJAobKEfR7%2FD%2FlM3UGOhuHHiSLXRMlPpAFoPnce%2BmPft%2Fg8OfQkoAXkQVwIyOCBCLyktAX6HeNo3QGuHqrPVXhA7ERxdZxTClM7dL8Wfk%2FJsB1Z3AN7my4nvCBiX2Be8AHJlJMznWTD07HtQ%2BV%2F9DCBGQ%2BaB0D34%2FwfNDQl%2BxDu1V8oBLYnIDO0RIYM3TiB7nkqOdRseHUAibnclyL3soy6vHBCJpPDhX36iRgODmko5zU1I%2FpAh94l5GjvudFPpAELN7XcK1%2FoyYfONIUPjjSG71F86%2FxX12pEQ3Vd5AaUiaeF%2BODpqEqieIYspWurBkq8YH9EXIUbwZJQQD4wH8M17qzJT6ovgOdRnVlCUr8YBB5he6ib3ieAJyHP3omBr%2BBdjf1kkaKusHkPXSK9dXmg4M9u3A7deAKx5gAPvDOITvpLrzDPQu6U652UCAf5MbVDYsw5iQ4c0gLdQCtrLDFBvHBiV7up%2BgbILIJYhch%2BKB5NCmHT2737To%2FQJMPatLJavJKaD7Ij0dV%2BEzr7bp8UJqmNbTVDuo5H0QG8IFV4IONgUcYASv9eeAh8EFngTB8ECQg8gEfQRCOfwQf2LXmBFz5KF0%2BaO1PFqBsuVvvxAeIoqYrMzT5oCjRcz9aTpeTrJLUUHzQNg556Zf0C%2FfpEyOlSYjykFjRZLyULqfPtk2aB2TgTLJZ1HywMbUuM8K4OtazgdyiX6JPXNsC%2BMDdi2bDm5eh6ft4JogoNKMH8UPn40U%2BMDaOAiK7%2BTQ%2FnzaeG%2BQ9hj%2BnX2J8PVOWKIqEAfXRCukbYPCNoQvJLL6HILPIrAguy4I99HvHdmnyUz8VXSE3lHAg%2FFQlKo9PQSyeTxcy4OWYAAi1zqR%2Fwl%2B%2FNULqdKabrg3X7Ny8U%2BhC7xQxfiAI8B3dRfq952wX%2BKA%2BjS7E8%2FPjxcm3JGAozyDf0P%2BonK7LB75ZdKFzrBw%2FkASg%2Bbxv0O9Ruw4f1MeTRzoetFnk6b8iEHE4kfwKf9owUmeAy7d6klXxA5VAhME9%2BVhKN%2FlAuI3%2FdD7gesIH73Sc7N4lGApinYNUfMALyHzQOAq%2BH%2BH5ADDThrYdipIDECoBW7z%2FHXK6uV%2FYE5hu8q8l%2B%2FxzZT5QBEyOZ%2FH7aI8uH9Sk07yO3dClBAoYCgdBgP5S7Sj9djB5ngbMeYY9PsolWHy5%2BH3fS5rAZVcI1JCfRnbTPIbzUiMaqieRS%2BS9M2lK%2FLtqiEqiNpqs9z8H6RdBxNj%2BANlH1sHVmpmAMd2KD%2BL3XT%2BT%2BKDidlxAys7Hq3I7MOHZQrb45lexLj0nmmxB22DqJYwUxrJB5CQ5yvjAdGSQdztuoI34gl3VHoacaOcM8grZgje5pvGTrooBG6ICgrKxDUMiuLXxjmW4Ft5c63ouBB8UpnoX8udBVkM8jwsRPxiJz8ObG%2Fzb3%2Buv9XibIDC9nKzRmHjGk4u%2B400Tdfkg5LAithUEZjT4QDnC8YFVzDAIR5TEB6sCj7B84As8BD7ouoA5SKATH5hFzAnHB4EswYXq2LW%2B81zliOmROnzQ0BeG1fk2S6gXtyRBEKrmyjRNPjgf75uGsmk2ejRk%2FNp0bSy6Tm%2FRjz3HT2YE8YHN4pp4I4tm40X227KADFoCI8jclpT6SRHGTTGel%2FANegt%2F6MrdkKyOH6TCeJxNn%2FTfBRk0jo9h4xl4ZlksfA7PhdEtI9DPEZnPR%2B%2BMlwa6D%2BFf0lvI0TJJlqi3woA6p6KXxAfeDDoP3c1%2FnfF%2F4%2F%2BOiMoxw8l%2F7XhV5oPJ%2FsvYo4QD2Zio3LzC6I45dF4t%2F0BbmABwe%2FN0%2Bnv86aF0hQ%2Fah2rygX8inecWTs%2FKBGJZ%2FKCIfu16J8KqOzA0JtN5HXMKYoVHlwnEscnYcCCj31Xeqx8%2FuJvOc0goowjw8YPX6Nf%2BpvTw52CP9c%2FGM7KkB0m5BCGe%2BAG%2BeSVDp2Mvs6hQV2pEsXWcmaeSu8cHJiZg%2Fel8YGJdiLUnfGD6KXygEqCHydvd5IPiGPsA1QyFF5AhqzlDjw8iKnrhzXij3K1bmYDIB2vj6WFcYO%2Bjc9Ioh9jcs6UHSSVgcmTTIv8OfT4YSmx0%2B7mUTgKG4wPBG3G2OaMLfOBbRGz%2BJ4Qvkyxg8a6jRb4czQZtVD1hb6WSbcTWMkzViIaKCfgseacwVeGD2kEqCUhYrqLZ9dKUmmufRWx4Fd%2BhCALpVnBmFLXPF%2FnAXDEBHSLFKj5o7oefJ%2BvIOu%2BDQphnURRZjzdC%2BtjM5obGigH4MD2Qzz%2BRpvwBnlxaSavIafk7y0tsiPLcg18i69Aa1138dKu6X2DS9mAMzy%2BL4x3P4FJahUs9iwP8CcL3%2FViK%2BxH%2BPNByR6j5u7E5A52iVbTSlwv%2BAI3H21g32L8YPx964rk%2FDhryUPM4HT6YbtJMi0IerGt8wIXhAyvLMAiHyAcGvDTwCMsH9sCD8UE3BMxBAkbJQmEWj%2FAWimA%2BMITo2F1xmvGDDF0%2BaOqFZ5K5ofnAlohbUVnd3RFWDT44Heedgud3zMdzqhJDfA7E%2BHE9uUE7XIcL0kPwgXMsfRTe%2FLB9FMSKOPsde9UzRM6WfGUCzweuVdhDbhC%2Fc%2F2LSarXPclkbsd8%2BpgvEwiYY56XL9HvSsewgEtURFRzBkHExfiAOz%2FAl0cpiDRfmyBL5Fs7HvTfVyLNGYzuPfTvuAMCLmb8R%2FzHiEjggwb8mUMKEJmaMvEFdF0JB8JPdZxyQsXp5D%2FR3yofgH%2BxMAHgdvu95FN888BwhQ%2FsQ7Q6N5O3jP7dU84iBVYmEMMmQoX4M%2B9R%2FVHK0DgT%2F438Z74QbBQEYln8YBj9mP7m8t0641SWxU%2Fp3x154m1SBPj4wWb8ma82PB9A7Jr8G%2FltTqrMB9IlMD5APkRr0nXmrmfSWu6ST1NqRCl%2BMOlEUleGWk7FB7xAD%2FnA%2Bk%2FmgzfJnm7ywcEYVz9VD8QLyHxwbfjpOB2R2lS6VuVHsjABkQ9y4%2BheeqC1t97YvITkQqJM4gNFwORcSI%2BjXF0%2BKB8MlqYNYqROETCc7A%2FWu4L64V3gA%2B9jcA7CSKxcgtmzih73PqfZoHWqJ%2BxUMllPcq8NVjWioeI2WkDeFrmF8UH9AJUEJCyXkMcbpCGTa5tGcvFSxgdMYIwFb6fHXQ9JfFA6zv8mLjwdp4rdgIVqBbiAZgsYtyiKrsQvArWII0V1P7wX7RL44FB%2F9zpwcZaQY%2BqUpcEW6bkT5u3gRIJ%2BEfigrk8gH2yK4flleVz7k2C%2FLMFFnicC8g%2FCiZ9IgiQFnAd%2BKqS1zVg%2FnBylJfSCd11ZH00%2BAKPrQvy0RmA6Fh%2FHbzaM1eUDTTst5MG0%2BIALoIOu84GFjc68aUl9hBHgbacBB%2BODIIFwfNBZoBMfmP4hfNAUoxk%2FGK7HB5D1999F78sxh3oRpn216FzNVE0%2BKI7xTwTr2hxyL4vrB8cPRuIK4qYuz74Tw4L4oNDsGEFn8wa%2Ba8N5Pmi9%2FZB6hshtSL4KgGmLdj6PW4mb2J1r1qkhxJ5I78NzOu73jBOe8H0J5FfkN%2BWjJD64Nhy3k5YsfjjnLvbzvk6dxI1rmhWrX5kFAg53yn2C0WWjP2AP8IGJeVF5PqjCNx1rpc6tfhI67b9aqOYDaHn5hN4bTv4N%2FaVqNm9AZQLAB9fuJr9A5OBQhQ9aBmnyge88%2FcFbwvjAwgQYH3iP4pueg13gg6b78F%2FIvx0Vgo2CAOOD0qGU0o%2Bqp%2BjyAXbTHxy7xNukCPB8sBHf9Jfp8IF9FPkt%2FvWaFHl4ly6B5RuJHTkh8xmeDwpTm5TTlBpRih9M6D4f8AKWnvCBhWX1fvKPUcyB%2FnQBuh1v7yYfFEarJvhmJiDzQdPQslgdkcZk%2FIL%2FuXyr3AeqBFbH4h30DUeazkn7nyBrfFPFz1ELGJ2PgultrS4fVECcna4UI3WKgOGdvmC9O1AzVL8djO65ZI33QZEPJAFwJdCDvqc0G7QlQXnpRBJeSdYwL6bUiLxv8gDZI2cYIf59pb9KAhKWWXRejRSS5xxT4DKehKs1CbcR%2BGATPeicI%2FFB9Rj%2FDnq4LFaJmaeBR3gxWey9V7hNSyM7lvifg5iaaGSp6It3kK1syDW93Rdg5116ih7wqdrDsNbaNomCD4o%2B6R3PJ%2Bgreq21BuQXoiE9xK2OdS5AJ%2BgpdMKzIAQfFCb47%2BPPgzzuDDU%2BG5uGkv3wye96VkH0VYsPGvrih8gCjYlnLHoL7wA%2FEqfDB5p2GQCf0HwgJQWFwxBueBczDMIRKfIBb1pSH%2BEEyOXAo7sC5pACAUswjGH5gH%2FdrDqMIVpknrVttMY5QKAu3RruywQPadMD6AP0hS051MubE2gpLgSXoIaIsXyUt5L%2Blf6IPqm4PYSNwtiWgS%2BAD6bZ%2FcbJIZ1fNxxKdu8nf6Y%2F4j%2B27QSbgNE%2B0RbAB1uSagAwc6I9SyDv30KuulZsVj0thra7yJfw5v%2FxFO9nuYvNEMMmvyjlfQ6MD9qHIsivLY5n8YO%2Bnm2kmbTg96%2BNlSVK0%2FA3yFM6XcyeGF3bwEp5HYDKxKykwAf%2Bixg7V8p8MB4X4HIlHMjyuYNlOi8eCn7Ib5kP0MwEgA%2BuTyEIOQ4PUfgAOhyDRjjce4Z%2B5y5iJMCMrSy2bvIcxNj9pv4oZai%2FF39Lfit6IQWBGGEyRl3UXzFZlw%2FQNfqd8zWZDyQBaD7I8GB%2F8Ziw52C4NhI8Bh8%2BnyzzgXQJQr6xnjTrdeywHKZlsooPhEaUbve4osTu8YGRCfSAD4z%2FH%2FDBRryxm3xwKMrdSxWA4AVkPqgbXByjI1KXxNtc5WmfWS2wKQYWDG21p%2BqcNHqMLvdlynygCBgd8%2BgulKPLB9X90HK8VIzUKQKGU73JTvxG3eAu8IFvJpyD4D5RLsHsWUx3%2BRZpNmi9apJTmICXoOXMayE1ouHqCPoGfk3OMAIfNKjX39Vb0aN4JtgFRD64ngnOrMdtnCjA88FLdJdzhsQH5aNQLsorjlHN1ToepAvpQs%2Bdwm1aayVPoGygFnGsqOmNIK7Chlzjkd7u5eDiPIp2uQcH8IH7NoiqghPJMYbng9rUQD44FAX0yG2KaXuUHCJHySH3I4eCFqdx%2BfG%2Bqfx50HkhrW2QOqBvQAQh37e8NE2TD2p6%2B2d3PFgYcuJ5MAbtwa9eHaHDB1lGzXSYoalXlrGnfGAJwQe8aUl9hOWD4sCjuwKmkAIqi6WehcIUlIsIxQeaHAb9gS4fNM%2F2%2B8iv8pJCYl48OYeONtweYdHgg9KRvvfpn%2Bj35KOqiaH4wJ5OTuNaUuPdXjA4iA%2Fyktx7yLfw5t%2B3b10KRj%2FH%2BLykgPxCYt3oCOOGKPdTpAxEyl3P5aj5wDEF%2F5p%2BT%2F%2FDc2Yvy12AecqHSHkG4wPwptqHkGpSJvBBUR%2FfK6QGRN5TmXlKUtEXfvvlaTIf5IILsoHnA2YltUL8oIg62p%2BXXPxXbkOH8HklHMgHuUYqfFA0BM7ni%2Br7eD5gAvCK%2FQ7c7m8%2BIsUM4IFv7a%2FNByfpl17BacCMrQIfeN%2BkDo%2BtC3zQeDf9Av%2F6iJCcFQQYH4CpqYW0Ab%2BFH6dyzL56%2BmX7FvFqFQFoPt9K6kDv6vBBcwb%2BkPgVPpAvQcg3VuJavY4d%2BKBJsY9KjSjFD8YWJnSTD5jAP5cPjD3lg1V4VTf5oChSNYCbAgQM9gG10Trvb0ngBxd52mdmAmIPZYumL6H1nmSdk8YP0GyvtChfLWB0zwLn3BK9FjHAOJhNsqrjOguc6NXxCt1cP6ALDQdmmmzvvSIfSAIm9yIw%2FD2q2aB2VXAFQl5ZKJvlUqRGBCsP2UI3yhFE4INW9fq7MgudTe%2BSV5NxjvE02z%2BP8QETyDSDvWCL5x72Ojj8yzPwWrJTxQd1SXgGnUfn%2BSYUskn9PCt6DM%2BH9LE4VtSnAWCsEvjgYC%2BAnTwwQG5tH6jOL1j8I6D95%2BE5bRk2mGCXJgeYviH%2FwK9EfyamfS7ZDW%2Fe7Z67IZgPCmLdk%2FjzwDPqQ43PXONAspXso3mexSWaa4q42lR8D54ROjBti8bb%2FS%2BDV1uPDzTDXRBrCcUHnNT7s8PKhs1wfBD4t5xoWlIfYSK3YDsNPPiHzBwkEBmGDzoL8GcAsBIbEc%2BOOGacjArbwejxQZalRYvDYGzQ5QNIW7fhD2yJoV7eH0fe8R9onKDJB%2BUZ3nP09%2FRrgmrGh%2BIDKPhRgN8nl9yvHB8YxAeHEz076Rfw5t%2B0vwJpAKP9Npt6hmjYnFA9ErIMUe5F6By%2F7te1eG28On4wGX1Iv6a%2Fc5%2FYPVzgAz6GXZrOEjJwx1sG4Uu4%2BDG%2Bk%2BGKe4Gn%2BhKcyckWxcxTmUJuoYbLkrvC6FwPLshKxge8ldQ63YRO0sa2JRIf1I%2FBb%2BJ3A%2FjgSobSvucG4Q%2FoxzX3MD7gBYAPWm%2FHDaT6rYEKH8CERIMPjL4j9JboNBAEoljWYSdt9GztAh80TaEf4w9EL6QgEC0Ea%2FmiNmUTdQYXoKFKekt2WygC0HwwU2lER3X4oDEd%2BUjbi0nywCJdghBPLMGltYN0%2BOBUsn2iig%2BERpT8B7rW%2B2A%2B4AXMPeEDocBRD%2FnA0AMBZnAydIsP8q2NyaocCy8g80Fzv0I9PqiPxw%2F558rTPpPaYpUTjV%2BgK51JOncATe%2BY75MW3ZlVAkZYwrsOPanLBxDZm08eEQPvKoHCVPoSfll7%2FYTK3Oy%2Fo2O%2B5072ScolmNCjZJ28siL47a1jMmWHdEEseQTPr09TNSLvm1xHVssRRAgHVvRSvb%2B4F%2F53jBtmiI8M1zYazFUzgA%2BE2wh8gJ6BYi9TxI8wlQ9DOfhV5Y5wTffgr8AD9Tff%2B5dYEQXI%2BT3gnwvUIgaiSlLxC2gZuzfGt1I9WcQGPs4NHtV6U25tmmsf%2BS%2F6d%2F8Prl02CIdUJQYsAwQ%2B4Fei50Q7ZuPt4J7c7p4VvMLAUjDWW4n%2BBiJfqOzc6m6vP97Af7Y%2FS8s%2FaIiIvDIXPMlfbQn5sByKwpvwSlgcGt4blxkNdjJOKy8eKgwl8IFymMN0nKbQfPDHwCMcH9DDgYfAB10XMAUJMD6IlMs2CWUZInX4QJ2NCMUHYOjltBJ5Yyzh%2BcDUdB9qQr7QfAA2kiNoF7gANOMH6b5T4MD7jDqqxoWMHwyBRcRF%2BKz75ZP9Q%2FABRPRv4c%2Fwzfb1PB84xuxTzxANtngwvHNQJeFx8g6IvOt8Ql3Kw3A9k%2Fjhk3%2FjO7J7KK%2BdGwc1N1rKh4nlpyIbB2J4UxbfyXClaZ5V%2BCyIHFaZeUqTyQ1%2FdYXkruDca8gNfAlWWpqYlRT4ANzCVY6npM6tYSTaSY4WxKonOukKH1wa6PfRjkreYCcKQMx9Aq0klw71V%2FgAontafOA9QG543mIPNDO2ssHV6N1Cq9yb9EcpQ%2F1k2oF8bw8T%2BYAXYHxQ2h%2BSRJVwf%2FT4wH%2BR3HC8LPOBJMDHD56lVf6DmWHPgS%2F%2B1kYblybKXx7pEtiDRM6gcwFmrlASJUmt4%2BUnQGpE8TX%2FiPxu8wEv8M%2FkA6G8Ug%2F4QKgR1T0%2BKLMQxSJjDLBYQdK2NErn%2FWWxN2b4FT%2BSSS2wIQoqhCxpSdA5aTwFSnpJ3zO1AOecCqa3%2Bfp8kIzn0NliqEMlcCqZLscv1PXpAh94x%2BM5vgnsXxQBE7gSVvg0K4GAhUbhg4MxZBZcRrKqEQ21g8C195w8QwA%2BqFXnWs6k4X9FzoZp4iNjsKeDuWoqzweCAHQoi8iK9tullqkagpfQl5Q7wjXchT4BD9Rf%2FOdKhvG9To6ZTPPfByYnMRBVmuxfTLOFkm%2FHUngLJvg4V7X3VbX9xlTXbvIH%2BoP%2FO%2BcOfl1XfXwgH%2BRbecvhhijXNBjic%2FEG17T8oPHLcny07xL6C9Sku6Wyc6vDpn3xKv6zvY9p%2BQeBD%2Bruh3juJ6EHlkNRaLV%2FqbwSVJsPyjVD443Jofmgc0GAcHzQuVAhJ5qWAmoiWsLwQedSicZQAuH4oLPA%2FwofaMZpIJGnzwf3%2BKuJfV9CaD5AebD%2BdkyEWSt%2BMMxTwBf5pE2Xx4aMHwyCRcRQMNSz8li%2FID7Yl%2BB%2BhXbgmxi3r4E0gNE%2BKpAP1saDU5nng4dhnD5OjzgXrFZFmwyuiVCj8yb9yHsgj3kb4GSrcC0sSBbvemt%2F8ErnC3xQkgrOJCgYive2DFPxAfb43q%2BYLPNBDhgYixgf8FZSC8QP8miJY5HEB1cy8Ktof3GMOn8zTOGD8wNgOaSr8k7GB7wAvNI8jl7AZ%2Ff3U%2BUXemvHD3YTt%2FdNkQ94AcYHvg20xPNSF%2Fig4XbqQtdPDhH5QBIwVPQFLrpweawuH8CSI7drlcwHkgDf2WZDodjdOnwA%2BZx6WpWTIH95FAHobGGl98kr%2FXX4oCgRauMpfCA0oviaJ13Xeh%2FEB7zAP5cPuJ%2FCB6phjhmcusUH3Kne9qnyHxoDHFJQAKgoUu8xGou%2FRZ%2FL%2BUaTWsAWCRVCsurjwyoMjvT56Y9uadWEWoDz3A6mt7l6fMBVzAJT0%2FeQKuwkUJQIq6Gfrk%2FTb7hIKBvyo1%2BomqgIGL0zyGIxvh%2Fq7ddGynxgODGS%2FIn%2BtZlfpik1IsybeeOf3APwdiJ1rgWm95%2Fglqv3SAXV2nbBOVBY8SsIwJ%2Fjh%2BHzJVI3Vg30P4GfV%2B4I13on%2BjlUgvvWd%2BrSEL75nk0hv0GfQ8hTsLFAMAAt7Jhv47%2BhxhNJnnl8aTq81KtaT8KtSXHvgCDEd%2BRL5xaYThmrMrckBUy6LGDINiyNdE6lK3kTqHNq8AoDy9FR3vfQtyByoznUtA%2FyP3gp%2F9meeVrlOKHoZB0EptHP14WeeEZCbbsn6gfo8MHUKLCTaQxt9sSu8YG5y3zAVhoZg0oahgGMoFKJDDA6C1jDpA9DCBhVZZtimDEiHB90LgcVig%2Fah2rGD%2FpmmnX4oOEuCLvX20J%2B58GPtNO%2FsWGkFh9wULf4ECvyWVM5OlShLfsAso0VDH2uoE%2Fn1w358e51MCIDHrTl8HzgGGGLDyz1BYY2bq3V9QBUJT%2BI8twPq5fqGhzjIV6Aqd%2B3e98ggQ%2FIRVxaPpjdd7jjzf3QW2TfM%2FyXmYM60E%2BzgqE7GpT1hSVJ6Bp6ryxTjI5w7mWkBZ2EAd%2FIrKQ8H9joKViubJSTJS%2Fj19UJXAg4Kvx1sR%2Bqo81VvC%2FLxASsfMASLMYFB%2FoofNB5QbE6frCDtHh2CnzABCLZv66mp9w5XeCDuom0GdUVCDl%2BQYDxQVkfdAK%2FW65XVAau9gRpcUpuC0UAWsb1M3oKb9fhg2uDYa3KRYUP5EsQ8o0HydsNfXX4oCyhVakFJzWi5D8YVhDbvfrKwm3sIR%2BY%2F7l8wAxO3eODE73a71T4IMAhBUHZep2FMIbqMeRLcutwYiiBtVawpD9SHafDB8hBv5d3OVALcJ5xYG6YocsHVTPon8g3kCrsJFCY0DGfLGhJ6QofvAfncIHdPEXACEu1FkIJcS0%2BaM6QPfGGYyPQN%2FRPjTN5PhAFIPwCnr3H5IQAfJ3r1OHzcynkI1TXcJf0FWrfAeYqN%2FCBeBvhK3Y%2FXdg2WuKD0v6QRlms4oPmOzDiy8n5jgv7GjyfjH5JbrENHRgf8LkfWIvOy3OHE92z%2BNJ09En1ehLgA%2BdWCEJ8SX7l3gTrvo3VkwKTtjYLhH94PsjkS9PhpWwVZOd58bERvnch8%2Fsl9V4LNe2D3D99ki5Hy92ztHJ%2BwAe108EfjjaHnHjmWwH05jf01eWDcs3QeEuCjespH4QoLmQMKmkYjg86l0rk%2BSBIIBwfhBAwwhvUfGDtIR%2FkmGFNvdb6hd66fADMeg5XhuYD6NZfRWuuZGjyQflgXx4r8lkKVoFQhTj74Y2sYOjTJ3qF4oPVuBWcb02OZcvjeDNjwFYhUOoLDG08H8yEquS7yE7XAwF8YL8NVUGF0DbPzt3M2wBz1LPoHNtOgXGhvQ%2FZg19%2FJJrFD5I8WRgKhqJc1frCqkRa5y%2B8PEniA9czUHz1CAz4RmYltWQZ%2FVvIUViuLOUXhuCVeLM6gQv%2BT4UPzvclUPy1ehLjAybAr2%2Bg%2BeitI71V%2BYVUbT7YjGu9W9jzKAgwPvC8AOfwXBf4oHkcFH8tPz5QjKlKArDCiRxC%2BZUjdPkAH8a1ziXStE8W4OMHj4FP%2BhUdPmgfCB6Ds2vj5eFdEYAHiezGe1t7661vTFCVYJYaUXzNO0TXeh%2FEB7yAqSd8YAq7O4ruj1BeyfTT%2BQCKTJH%2F6t4lcGfS7HfIfxjNBORGrEsq0zGyGGpHwTLhG3I8MZYJiF0cbHEyk87W2UYj3epvpl%2F7tokPUpxKgLOPovPIVL3L4KqmQVmxzyEH30ngdBx%2BgMytS%2BpCw3nehZJeZ9jXRrkEo%2Bd2Os%2Brvb1TY7rCBwXpkLz8fdN98LvUiPy4CMY%2FOSEAX%2BeAXAvwAcLljXfKfLCFfo2uQXw%2FigmYs4zee2FJgJR5MZb18c8lC5T4PtdwO3SmUE7O%2F%2Fa5QXzzPZ2EoGgLRFGjWZzZXB2HZ6LpZazCan685x6%2BNB19TM1LsCjcvQl%2FCGnbD9wv83xwZcLmgKBsoZm3HK61OsbDWkwwgXrHh%2BCDgnTvMSiacstvh9hxCD6oTIElKtko23OPVkyP54N7STVuDz2wAGjOJ3P1%2BgPY%2FwoYUWNoc8Vp8UHgmG%2FW%2BXoH8UHnkoZhACOoVCLjg84CljB8EELAyJbfCUUdhbJNVh0%2BUJeDCuaDTLPmmnp4oHX54Hqm%2Fx1UkhsXOk0EOxgth2XrGl0cB3WLX%2BeLfJL3yjNC8AFn74Nf5At1un6WnxbEB%2FvjPC90QJFPyPE%2FA2kAzjkskA82xcBgD8DrvRdvApFXXDNzotXxgzHkIl%2Fk07t5D%2FM2bIrBx%2F3vQEFwISxsgfrL2%2FFmxgcQuPY%2BRjeDd%2Fol1fqBsgRyGeVfHi%2FzwZNQ%2FHUf4wPeSgpfZ3Aj7YPlysKJQ8VvsBm9rE7gQkJS4YOiPjAeXaoZz%2FiAF7DwExKaBwVNlJgB19n8rc4vrMfvezYIIVEmwLo037Nkn%2Fsp%2FUEGAsNQ%2FLU4f4DIB7wA44PStI7dKK9yuH78IA%2B%2FL7stFAGeDx4k%2B%2FBL4bfV4Tf%2Bg%2FXUy%2BPk4V26BPYgkW14B5i5wvPB%2BXiVfVRqRCl%2BMOhgN%2FmAYwI94AOu53xg7Skf%2FBH%2Fu0qgK%2Bs3ClPlDDdsbsQE5JrXLfcW692DqyPwB8gr80EMExBv46Ze6HfkD7AnQXg%2BAD%2FsZ75c8UGKVQlYnIfA9ObL1IFdrvwe8in9uHRoJwHD8fH0v%2FD%2Fqb9Xf%2F8Fq6cAyooJVZWVS4jy1tK%2FQ1RB446AhUbhg%2FzhMHf%2F9DqfjJAakat%2BGP0N%2FbloiMIHAbmWU8m4HZVcvUNaEN22CcxV9cAHkUzAPD4Gf0T%2F7topdSj1ad4ZHQ8qxMY1TURNfDk5374KFnp%2FOgm7kRf63yg2TliqxqF%2FJZ%2FaWMp0f5x7MitN94DaL8q9mOR%2BmfjJDeR1rIYvjLFqXAAfQNE5qGoMpeOh93wEgjGPeEcHrzAw5w93H6Id4MZqAF4PbiwO1lk8AJ88H03WYnaoIVt3Ny5FTWtDTzwtZC6eYU%2FV5QOwk2nlF2JD8YGhm3wQZP43BpU0DCMQVCqRE21TAQKWbggYJD6QyjZFhuUDrkt80HlNvfJaSWqoIhLq5jS2TEL55IwtNtTL4Eda4V9cN1iTDyoG%2BLayIp%2FvVA4PwQcGdy%2Bo5QWFOj2PQvH8znxQEAu7hJXBmy85snk%2BsA8JKAUOpTz4hDVUWZwKG32swy8571UvxQEzETgOq3ClbwPk941sjnqIHr7Yj913eDZgMdAmtH6REGNP8M%2FDL4PIC%2B1KjBuidef9BypuE6MjnHchJOpf5%2FmAWUmBD8CFY2uT7EywUwXKRjnqBC6MiQp%2FgXu5EJ%2Bt4DdTEwTguWgZxhezf0sxMXGdzd9qS9VqKP66RuADJmBl%2F%2FoksXl%2F1gU%2BqBuNz%2BLCY4LXQRGAZRp0O9lZOlQ%2FfvA6LZLdFioByP3fD17lFeHPAbzx5Jj%2F7dWxMlwrApBvxBtRbq3Ownkox9mo2EflRhR%2B7AMKo7vJB0ygB8M7J8btfvKPRYxx%2FmQ%2B4ItMfdVNPjiXYp%2Bo4gNeQOriuMa7z6Tp7d%2BYQb3oen68zAe8gHgXtqaR3%2BCv2jJ0%2BACV4Zvi3sr88K4IWFx5YL9r0%2BWDiqnkF5ReGtJJwHDiNvoH%2FGeo56rPB1BP%2FaYvX%2BQDSSDKc5n%2B4DuryQf2IQofHB0Kc%2FdfQD1Pg9yIXM089Bf0zenBcg%2FFlan7zZIkmK%2BcAcu%2FVE36ZTBXVTI%2BYLdxfAzC9AfnVokPKlPAyTmDyK3B1Y%2BHJdlQTs63q5Tta7CUr197HbKsIh%2FUjEX%2Fgm8KfHAwhrdgggFymjqGwa1LdL1I7LCL9jXXCxBuNdaMtakr13F5zAKcY%2FakQzX0Of7ZnnRbUGuYjw717qUuyP1WMu9D0P1pSSDT%2BM%2F2jtf6TvJ8MAWdI9WhJ56FsJ%2Brb2pjsi4fVGmGxpties4HxlB80LmkYRiBULUWTUEC2nwQXGvRIKyqjpKLOkayTiR8AlNdLjIUH7Rq%2Bb7ACKzLB63jYQ%2FRgtB8YON3MPpZ1UBNPnivv3cTX%2BQTH5F3LQv8wqXip%2FhCna4HgovfQf7A8zR9DyqEnmn%2FGdgEuE4zROADfjPEHLMzE8wsK6AW%2BBR1qVBDywjYgLUEX3Cv2cO2WII56h6693xf6a63pJDVeCXbb9hQHeeehV%2FgYUcV0zofjwvRLjBOiHzgeRR2PN8CnRfbwpvnA%2F9zJNcubVwAO1WQx9GzAXxwpb%2FCB%2BBehuKvlaMZHzCBiIiGISQXrT%2BUrP5qaQ5nvueh%2BOoKkQ94AQv718dJLmyGp88HULylAB95u6%2FIB7wAe7BKk2ET7Vf01hby2%2Bpsocdlt4VKANYO3AeX8awOH4Cp%2BQB%2BU8UH0iUIfPAiWVOZonMJZbGq7SnkRhR%2BXP1Ko7rLB%2BF3X%2F9%2FxQfGnvDBJ%2FjXKoGu8MGp5LZxKj7gBWQ%2BuD6lRGfOZqgfTq9hxY8UzQTE27gxFczIv7anhz0BqAJUjDGALicChiJgce2CEmSNunxQO5kg6iob1EnAcHIM%2Fgp%2F0zRFnw8snjyMvQfYzVMuIdJ7gX7nPakVUwILjcIHh4cgJ0GtdzI%2BEBqRq5mDwLt5dqCSH29Q236LEsEhfRyWg0t88CKUFbvI%2BIAXMGVGgzPjO%2BcrQrGniMjy%2B6Fgy9clqcrnj8WX%2BHJy%2Fu0wzeG3lElAV3A9zM8EPjDXjSYf%2BSnbLh48hO73%2BdJ0%2BDOV3YRfFO56gVwFI1WdcylURjTWjV4bH1h0DizAxpzU9j3ke%2Foj%2Bd612xZkMTQdHgLlZqGcHCoBXg9%2BfGEnGojv%2FEj%2F6nu%2FND304w18cPUOmC9dCj2w7E2BWvgYzB3hu5R0a7lWyRSuZUSWJVR9pM4FBU06fNDJ%2FG8MKmkYLn7QuVRiNwW4kAIBZZusDHS0e6jO5aCCW2S6qfOaeuW1qkRdPoBn8nV8cFPInCLYSBb6Hq7up9XF8XUJX%2BKLfKK88sGh%2BAD2SHicL9TpmX44qPgdFIr3LaJQ5JMWtD0GmQPOPiBwK9INUXwpjxwzlBl5EnzD2e5J6lJgBtdwWDt5Cr%2FreeHN3vxnb4iCfMKOi72ltDHsV7QMLxH4oCwWdi15GmBnoWofasjmHUHbSkfKfDAPXJDrofPihG27s4xQpWWNQ6r4CztVQBBikXo5EIyJCh%2BAexmK07M8P%2FOl8s8FFBKB7atVxae4zuZv1XDmfpYe9AjVFgQBixjbX%2BN7QH%2BQgdr69ADeK3odFAHeZrGSrK7QWVsI24Ci9fRgm%2By2UASgqe8Ct3KWTrF0KB4PxeWeiZGHd0UAHiTyHCSqdBbOQ7nua4NVfCA2ovDj7V0U2V0%2BCL99exf4wPhTtmf%2BR%2FIB%2FTn%2BsJt8UJLkVAatSCYg80HL5HMpOnwAtXOv4or90rQvmgmIt3FLCiLo59eG6%2FABbN7jkHdBilEJmJ07YA%2FVmukmPf9BJl8a%2FdLATgKG46NhoP28fnIX%2BMD9BnW4hV0XlEuI9JylX4pRhVB80D5Qtb%2FzINKM25t5K4fUiFzNLHDtfXx%2BgMIH1eq9piFhedH%2F9lVp1yFT%2BwvgzDoLfGBlAsAHuIV%2B6Vwv8UH1TL8TfS5v5wAhuNGwJBvKyflyhX0NFseTy7gC0F5coF8%2BCqzgbtZXWw6P9BTzpenox6471Ps3JjiXknIQuexazPNB%2BajcuMCic%2FyuB2tSHDbY7%2F57%2FI1n576gEsawN6RvKysnd6ZlWCg%2BgJ1ofgmf%2FCdP8aXhmnxQezvKx0UaE89k%2FGvkbJ6uywdVWqFxrjlDiw8CYwLh%2BSDI3GcMKmloCjP971wqMaSAuZsCKj6I%2FIfwQec19arJQHyWUYcPmkejrUTZ771Tmghqpcyu6a3JBxd7%2B1fwRT6JDW5kqPhBIpThgkKdrrvyg%2FZngELx7sc7oMgnlCR%2FEGwCEL8P5AOhlIfN5B1NH6Owrsd9WwAfQP3kPWCby%2FctsTHvI8xRN5Hc0jTpntsTIXbxxDyrMPCgyWQBeKcfUm04UhYL29BuKpfcl5x7Nux4%2FiLjA7Ztt40jj9Pl7VLhQb4g2Ez8sNrgBWOiwgewXBKK05emMz4Q9%2F2GlMRyvES1eJTrbP5W5xeepLtgc3iBD3gB%2FsHi%2FLPpcu%2BMLvBB01Ao%2FrpD9DoIAhah1wKn8rKKvrp84H8Rir%2FOkflAFoD4wR3gVn5Mhw8cabxJJCdaHt6lS4jg%2FUgIFqbBHl56fKBKlRkDN0939%2Bo%2BH4Tfvv1%2Fnw%2BE5ZE94AO%2BRpS3e3xgOJEkO%2BR5PuAFZD5oytTlg6ohpByVyN16lFpgTQrMqf3tQ3X4wH%2BMNnqXiScbrRIwOzaDc65Ujw8MVRNhaVJtaf9OArDmsOND%2FMu6zK7ED7bBOexgj49yCZFQovQWbGaisb8zpAsVPjg%2BENfghpZJjA8EAX5dxcek473%2BSvw7YK%2Fp8%2FHkDN4Llj6JD5ZCWbETcLVWJmCaGoWu0FvONSIfWCun%2B1rQx6XJynRjJCw1gnJy3nUXe4t8UIxKYBlgJIszmytHIAduZX21%2BUiG%2BzQrTXdDZTfhF4U7n8bnQeSc8wmonAw7%2BAYkbbl9Cc2w0uz5ZMc29Dm4Jz%2F3bN0czAf5A7yb%2BHJytMA%2BJGT8YBLpgNJ0v%2FeeLhmmxQfmKxPQfnQi9MQzLwl9iFta7tXlg%2FNa0xqufniOuSt8oP3ti2LLBOLFIxZ%2BN4mmpYCShtqnGBVUKtEcIZjXAgS0%2BcAaJGAKVQIyTAWGoL%2FlQvCBW8tzBHF1XT6AMP0Gsk2TD2bieyBtrMUHxb18S%2Fgin%2FTVK6E2Ajf44jum84U6PbcXxAbnF6K9D5E9sE37Luf9i%2FjNDvsElAIHky0EpIEPPFBmBHzDD7hGqkuF8uvptsOb87zZb6UKfEBW05dKUiUq9MXD8P4o228YUMQ3gcwFkZmqguLFsHoTrSkfJu56ZXDfB8VXl8HXmW3hzfOBfx7NbpM2dIKKHP67yCx1QXFYG6DEZ0qS%2BH3X2R4DogAkzfvAuLgoP16dNtPOLzwOxVcXiHzACzA%2BAMtztvvuLgwydYP58Vn0OigCECYBp%2FKTNb11%2BYA8R7bYpcVnKgG4jRNgOZJeDMOeCk6TNRui5OFdEeAfJFiYprNwnt8gV5UqkxtR%2BPGn5Fu7ywfhd1%2FvEh8Ywwv8X2e%2Bw%2FO54nTXAAAAAElFTkSuQmCC";

    DELAY = 50;

    FRAME_COUNT = 19;

    SIZE = 32;

    SPINNER_ID = "overlay-spinner";

    function Spinner() {
      this.findSpinner() || this.buildSpinner();
    }

    Spinner.prototype.findSpinner = function() {
      return this.element = document.getElementById(SPINNER_ID);
    };

    Spinner.prototype.buildSpinner = function() {
      this.element = document.createElement('div');
      this.element.setAttribute("id", SPINNER_ID);
      this.element.style.backgroundImage = "url(" + DATA_URI + ")";
      this.element.style.backgroundPosition = "0 0";
      this.element.style.backgroundRepeat = "no-repeat";
      this.element.style.boder = "none";
      this.element.style.height = SIZE + "px";
      this.element.style.left = 0;
      this.element.style.margin = "18% auto 0 auto";
      this.element.style.padding = 0;
      this.element.style.right = 0;
      return this.element.style.width = SIZE + "px";
    };

    Spinner.prototype.show = function() {
      this.startAnimation();
      this.element.style.display = "block";
      return this.element.style.visibility = "visible";
    };

    Spinner.prototype.hide = function() {
      this.element.style.display = "none";
      this.element.style.visibility = "hidden";
      return this.stopAnimation();
    };

    Spinner.prototype.startAnimation = function() {
      var current_frame;
      current_frame = 0;
      return this.interval = setInterval((function(_this) {
        return function() {
          var offset;
          offset = current_frame * -SIZE;
          _this.element.style.backgroundPosition = "0px " + offset + "px";
          current_frame++;
          if (current_frame >= FRAME_COUNT) {
            return current_frame = 0;
          }
        };
      })(this), DELAY);
    };

    Spinner.prototype.stopAnimation = function() {
      return clearInterval(this.interval);
    };

    return Spinner;

  })();

}).call(this);
(function() {
  var bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

  Memberful.Overlay = (function() {
    var OVERLAY_ID;

    OVERLAY_ID = "memberful-overlay";

    function Overlay() {
      this.visit = bind(this.visit, this);
      this.buildOverlay = bind(this.buildOverlay, this);
      this.spinner = new Memberful.Spinner;
      this.findOverlay() || this.buildOverlay();
    }

    Overlay.prototype.findOverlay = function() {
      return this.element = document.getElementById(OVERLAY_ID);
    };

    Overlay.prototype.buildOverlay = function() {
      this.element = document.createElement('div');
      this.element.style.cssText = "display: none;\nvisibility: hidden;\nmargin: 0;\npadding: 0;\nborder: 0;\nz-index: 9999999999;\nposition: fixed;\ntop: 0;\nleft: 0;\nright: 0;\nbottom: 0;\nheight: 100%;\n" + (this.cssTransition("all", "0.2s")) + ";\nopacity: 0;\nbackground-color: rgba(0,0,0,.65);";
      this.element.setAttribute("class", "memberful-overlay");
      this.element.setAttribute("id", OVERLAY_ID);
      this.element.appendChild(this.spinner.element);
      return document.body.appendChild(this.element);
    };

    Overlay.prototype.visit = function(url) {
      Memberful.debug("Overlay#visit(" + url + ")");
      if (this.memberfulIframe) {
        return this.memberfulIframe.visit(url);
      } else {
        this.memberfulIframe = new Memberful.MemberfulIframe(url);
        return this.element.appendChild(this.memberfulIframe.element);
      }
    };

    Overlay.prototype.show = function() {
      Memberful.debug("Overlay#show");
      this.memberfulIframe.hide();
      this.spinner.show();
      this.element.style.display = "block";
      this.element.style.visibility = "visible";
      return setTimeout(((function(_this) {
        return function() {
          return _this.element.style.opacity = 1;
        };
      })(this)), 20);
    };

    Overlay.prototype.showIframe = function() {
      Memberful.debug("Overlay#showIframe");
      this.spinner.hide();
      return this.memberfulIframe.show();
    };

    Overlay.prototype.hide = function() {
      Memberful.debug("Overlay#hide");
      this.element.style.opacity = 0;
      return setTimeout(((function(_this) {
        return function() {
          _this.element.style.display = "none";
          _this.element.style.visibility = "hidden";
          _this.memberfulIframe.element.remove();
          return delete _this.memberfulIframe;
        };
      })(this)), 220);
    };

    Overlay.prototype.cssTransition = function(affecting, duration) {
      var prefix;
      return ((function() {
        var i, len, ref, results;
        ref = this.domPrefixes;
        results = [];
        for (i = 0, len = ref.length; i < len; i++) {
          prefix = ref[i];
          results.push("-" + prefix + "-transition: " + affecting + " " + duration + " ease-in-out");
        }
        return results;
      }).call(this)).join(";").toLowerCase();
    };

    Overlay.prototype.domPrefixes = ['Webkit', 'Moz', 'O', 'Khtml', ''];

    return Overlay;

  })();

}).call(this);
(function() {
  Memberful.OverlayController = (function() {
    function OverlayController() {
      this.overlay = new Memberful.Overlay(this);
      this.rpc = new Memberful.Rpc;
      this.listenForRpcEvents();
      this.openOverlayAfterRedirect();
      document.addEventListener("keyup", (function(_this) {
        return function(event) {
          if (event.keyCode === 27) {
            clearTimeout(_this.fallbackTimeoutId);
            return _this.overlay.hide();
          }
        };
      })(this));
    }

    OverlayController.prototype.openOverlayAfterRedirect = function() {
      return this.navigateFromHash(window.location, (function(_this) {
        return function(url) {
          _this.openUrl(url);
          return window.location.hash = "memberful_done";
        };
      })(this));
    };

    OverlayController.prototype.navigateFromHash = function(url, callback) {
      var openUrl;
      url = new URL(url);
      openUrl = new URLSearchParams(url.hash.substr(1)).get("memberful_open");
      if (openUrl) {
        if (Memberful.testOverlayUrl(openUrl)) {
          callback(openUrl);
          return openUrl;
        } else if (Memberful.testMemberfulUrl(openUrl)) {
          return window.location = openUrl;
        }
      }
    };

    OverlayController.prototype.openUrl = function(url) {
      Memberful.debug("OverlayController#openUrl(" + url + ")");
      this.overlay.visit(url);
      this.overlay.show();
      return this.fallbackTimeoutId = setTimeout((function() {
        Memberful.debug("OverlayController#openUrl:timed_out " + url);
        return window.location = url;
      }), 6000);
    };

    OverlayController.prototype.listenForRpcEvents = function() {
      this.rpc.listen("page.loaded", (function(_this) {
        return function() {
          Memberful.debug("OverlayController@rpc: page.loaded");
          clearTimeout(_this.fallbackTimeoutId);
          return _this.overlay.showIframe();
        };
      })(this));
      this.rpc.listen("close", (function(_this) {
        return function() {
          Memberful.debug("OverlayController@rpc: close");
          _this.overlay.hide();
          if (_this.reloadOnCloseUrl != null) {
            return window.location = _this.reloadOnCloseUrl;
          }
        };
      })(this));
      this.rpc.listen("goTo", (function(_this) {
        return function(url) {
          Memberful.debug("OverlayController@rpc: goTo(" + url + ")");
          if (!_this.navigateFromHash(url, _this.overlay.visit)) {
            _this.overlay.hide();
            return window.location = url;
          }
        };
      })(this));
      this.rpc.listen("redirectOnOverlayCloseTo", (function(_this) {
        return function(redirectUrl) {
          Memberful.debug("OverlayController@rpc: redirectOnOverlayCloseTo(" + redirectUrl + ")");
          return _this.reloadOnCloseUrl = redirectUrl;
        };
      })(this));
      this.rpc.listen("scrollToTop", function() {
        Memberful.debug("OverlayController@rpc: scrollToTop");
        return window.scrollTo(0, 0);
      });
      return this.rpc.listen("reloadOnCloseWith", (function(_this) {
        return function(remoteLoginUrl) {
          var url;
          Memberful.debug("OverlayController@rpc: reloadOnCloseWith(" + remoteLoginUrl + ")");
          url = new URL(remoteLoginUrl);
          url.searchParams.set("redirect_to", window.location.href);
          return _this.reloadOnCloseUrl = url.href;
        };
      })(this));
    };

    return OverlayController;

  })();

}).call(this);
