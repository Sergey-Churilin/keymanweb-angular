'use strict';
var com;
(function (com) {
    var keyman;
    (function (keyman) {
        var KeyEvent = /** @class */ (function () {
            function KeyEvent() {
            }
            return KeyEvent;
        }());
        keyman.KeyEvent = KeyEvent;
        ;
        var AttachmentInfo = /** @class */ (function () {
            function AttachmentInfo(kbd, touch) {
                this.keyboard = kbd;
                this.touchEnabled = touch;
            }
            return AttachmentInfo;
        }());
        keyman.AttachmentInfo = AttachmentInfo;
        var LegacyKeyEvent = /** @class */ (function () {
            function LegacyKeyEvent() {
            }
            return LegacyKeyEvent;
        }());
        keyman.LegacyKeyEvent = LegacyKeyEvent;
        var KeyInformation = /** @class */ (function () {
            function KeyInformation() {
            }
            return KeyInformation;
        }());
        keyman.KeyInformation = KeyInformation;
        var StyleCommand = /** @class */ (function () {
            function StyleCommand(c, s) {
                this.cmd = c;
                this.state = s;
            }
            return StyleCommand;
        }());
        keyman.StyleCommand = StyleCommand;
    })(keyman = com.keyman || (com.keyman = {}));
})(com || (com = {}));
// Defines a number of KMW objects.
/// <reference path="kmwtypedefs.ts"/>
/**
 * @this {Promise}
 */
function finallyConstructor(callback) {
    var constructor = this.constructor;
    return this.then(function (value) {
        return constructor.resolve(callback()).then(function () {
            return value;
        });
    }, function (reason) {
        return constructor.resolve(callback()).then(function () {
            return constructor.reject(reason);
        });
    });
}
// Store setTimeout reference so promise-polyfill will be unaffected by
// other code modifying setTimeout (like sinon.useFakeTimers())
var setTimeoutFunc = setTimeout;
function noop() { }
// Polyfill for Function.prototype.bind
function bind(fn, thisArg) {
    return function () {
        fn.apply(thisArg, arguments);
    };
}
/**
 * @constructor
 * @param {Function} fn
 */
function Promise(fn) {
    if (!(this instanceof Promise))
        throw new TypeError('Promises must be constructed via new');
    if (typeof fn !== 'function')
        throw new TypeError('not a function');
    /** @type {!number} */
    this._state = 0;
    /** @type {!boolean} */
    this._handled = false;
    /** @type {Promise|undefined} */
    this._value = undefined;
    /** @type {!Array<!Function>} */
    this._deferreds = [];
    doResolve(fn, this);
}
function handle(self, deferred) {
    while (self._state === 3) {
        self = self._value;
    }
    if (self._state === 0) {
        self._deferreds.push(deferred);
        return;
    }
    self._handled = true;
    Promise._immediateFn(function () {
        var cb = self._state === 1 ? deferred.onFulfilled : deferred.onRejected;
        if (cb === null) {
            (self._state === 1 ? resolve : reject)(deferred.promise, self._value);
            return;
        }
        var ret;
        try {
            ret = cb(self._value);
        }
        catch (e) {
            reject(deferred.promise, e);
            return;
        }
        resolve(deferred.promise, ret);
    });
}
function resolve(self, newValue) {
    try {
        // Promise Resolution Procedure: https://github.com/promises-aplus/promises-spec#the-promise-resolution-procedure
        if (newValue === self)
            throw new TypeError('A promise cannot be resolved with itself.');
        if (newValue &&
            (typeof newValue === 'object' || typeof newValue === 'function')) {
            var then = newValue.then;
            if (newValue instanceof Promise) {
                self._state = 3;
                self._value = newValue;
                finale(self);
                return;
            }
            else if (typeof then === 'function') {
                doResolve(bind(then, newValue), self);
                return;
            }
        }
        self._state = 1;
        self._value = newValue;
        finale(self);
    }
    catch (e) {
        reject(self, e);
    }
}
function reject(self, newValue) {
    self._state = 2;
    self._value = newValue;
    finale(self);
}
function finale(self) {
    if (self._state === 2 && self._deferreds.length === 0) {
        Promise._immediateFn(function () {
            if (!self._handled) {
                Promise._unhandledRejectionFn(self._value);
            }
        });
    }
    for (var i = 0, len = self._deferreds.length; i < len; i++) {
        handle(self, self._deferreds[i]);
    }
    self._deferreds = null;
}
/**
 * @constructor
 */
function Handler(onFulfilled, onRejected, promise) {
    this.onFulfilled = typeof onFulfilled === 'function' ? onFulfilled : null;
    this.onRejected = typeof onRejected === 'function' ? onRejected : null;
    this.promise = promise;
}
/**
 * Take a potentially misbehaving resolver function and make sure
 * onFulfilled and onRejected are only called once.
 *
 * Makes no guarantees about asynchrony.
 */
function doResolve(fn, self) {
    var done = false;
    try {
        fn(function (value) {
            if (done)
                return;
            done = true;
            resolve(self, value);
        }, function (reason) {
            if (done)
                return;
            done = true;
            reject(self, reason);
        });
    }
    catch (ex) {
        if (done)
            return;
        done = true;
        reject(self, ex);
    }
}
Promise.prototype['catch'] = function (onRejected) {
    return this.then(null, onRejected);
};
Promise.prototype.then = function (onFulfilled, onRejected) {
    // @ts-ignore
    var prom = new this.constructor(noop);
    handle(this, new Handler(onFulfilled, onRejected, prom));
    return prom;
};
Promise.prototype['finally'] = finallyConstructor;
Promise.all = function (arr) {
    return new Promise(function (resolve, reject) {
        if (!arr || typeof arr.length === 'undefined')
            throw new TypeError('Promise.all accepts an array');
        var args = Array.prototype.slice.call(arr);
        if (args.length === 0)
            return resolve([]);
        var remaining = args.length;
        function res(i, val) {
            try {
                if (val && (typeof val === 'object' || typeof val === 'function')) {
                    var then = val.then;
                    if (typeof then === 'function') {
                        then.call(val, function (val) {
                            res(i, val);
                        }, reject);
                        return;
                    }
                }
                args[i] = val;
                if (--remaining === 0) {
                    resolve(args);
                }
            }
            catch (ex) {
                reject(ex);
            }
        }
        for (var i = 0; i < args.length; i++) {
            res(i, args[i]);
        }
    });
};
Promise.resolve = function (value) {
    if (value && typeof value === 'object' && value.constructor === Promise) {
        return value;
    }
    return new Promise(function (resolve) {
        resolve(value);
    });
};
Promise.reject = function (value) {
    return new Promise(function (resolve, reject) {
        reject(value);
    });
};
Promise.race = function (values) {
    return new Promise(function (resolve, reject) {
        for (var i = 0, len = values.length; i < len; i++) {
            values[i].then(resolve, reject);
        }
    });
};
// Use polyfill for setImmediate for performance gains
Promise._immediateFn =
    (typeof setImmediate === 'function' &&
        function (fn) {
            setImmediate(fn);
        }) ||
        function (fn) {
            setTimeoutFunc(fn, 0);
        };
Promise._unhandledRejectionFn = function _unhandledRejectionFn(err) {
    if (typeof console !== 'undefined' && console) {
        console.warn('Possible Unhandled Promise Rejection:', err); // eslint-disable-line no-console
    }
};
/** @suppress {undefinedVars} */
var globalNS = (function () {
    // the only reliable means to get the global object is
    // `Function('return this')()`
    // However, this causes CSP violations in Chrome apps.
    if (typeof self !== 'undefined') {
        return self;
    }
    if (typeof window !== 'undefined') {
        return window;
    }
    if (typeof global !== 'undefined') {
        return global;
    }
    throw new Error('unable to locate global object');
})();
if (!('Promise' in globalNS)) {
    globalNS['Promise'] = Promise;
}
else if (!globalNS.Promise.prototype['finally']) {
    globalNS.Promise.prototype['finally'] = finallyConstructor;
}
//Autogenerated file - do not modify!
var com;
(function (com) {
    var keyman;
    (function (keyman) {
        var environment;
        (function (environment) {
            environment.VERSION = "11.0";
        })(environment = keyman.environment || (keyman.environment = {}));
    })(keyman = com.keyman || (com.keyman = {}));
})(com || (com = {}));
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var com;
(function (com) {
    var keyman;
    (function (keyman_1) {
        /*
        * Note that for many of the actual events represented by methods in this file, `this` is replaced
        * automatically by JavaScript's event handling system.  As such, many 'wrapper' variants of the events
        * exist to restore the object-oriented hierarchy below.
        *
        */
        var CommonDOMStates = /** @class */ (function () {
            function CommonDOMStates() {
                this._DisableInput = false; // Should input be disabled?
                this._IgnoreNextSelChange = 0; // when a visual keyboard key is mouse-down, ignore the next sel change because this stuffs up our history  
                this._Selection = null;
                this._SelectionControl = null; // Type behavior is as with activeElement and the like.
                this.modStateFlags = 0; // Tracks the present state of the physical keyboard's active modifier flags.  Needed for AltGr simulation.
            }
            /* ----------------------- Static event-related methods ------------------------ */
            CommonDOMStates.prototype.setFocusTimer = function () {
                this.focusing = true;
                this.focusTimer = window.setTimeout(function () {
                    this.focusing = false;
                }.bind(this), 1000);
            };
            return CommonDOMStates;
        }());
        keyman_1.CommonDOMStates = CommonDOMStates;
        /**
         * Declares a base, non-touch oriented implementation of all relevant DOM-related event handlers and state functions.
         */
        var DOMEventHandlers = /** @class */ (function () {
            function DOMEventHandlers(keyman) {
                /**
                 * Handle receiving focus by simulated input field
                 */
                this.setFocus = function (e) {
                    // Touch-only handler.
                }.bind(this);
                /**
                 * Toggle state of caret in simulated input field
                 */
                this.flashCaret = function () {
                    // Touch-only handler.
                }.bind(this);
                /**
                 * Handles touch-based loss of focus events.
                 */
                this.setBlur = function (e) {
                    // Touch-only handler.
                }.bind(this);
                // End of I3363 (Build 301) additions
                // Universal DOM event handlers (both desktop + touch)
                //TODO: add more complete description of what ControlFocus really does
                /**
                 * Respond to KeymanWeb-aware input element receiving focus
                 */
                this._ControlFocus = function (e) {
                    var Ltarg, Ln;
                    var device = this.keyman.util.device;
                    var osk = this.keyman.osk;
                    e = this.keyman._GetEventObject(e); // I2404 - Manage IE events in IFRAMEs
                    Ltarg = this.keyman.util.eventTarget(e);
                    if (Ltarg == null) {
                        return true;
                    }
                    // Prevent any action if a protected input field
                    if (device.touchable && (Ltarg.className == null || Ltarg.className.indexOf('keymanweb-input') < 0)) {
                        return true;
                    }
                    // Or if not a remappable input field
                    var en = Ltarg.nodeName.toLowerCase();
                    if (Ltarg.ownerDocument && Ltarg instanceof Ltarg.ownerDocument.defaultView.HTMLInputElement) {
                        var et = Ltarg.type.toLowerCase();
                        if (!(et == 'text' || et == 'search')) {
                            return true;
                        }
                    }
                    else if ((device.touchable || !Ltarg.isContentEditable)
                        && !(Ltarg.ownerDocument && Ltarg instanceof Ltarg.ownerDocument.defaultView.HTMLTextAreaElement)) {
                        return true;
                    }
                    DOMTouchHandlers.states.activeElement = Ltarg; // I3363 (Build 301)  
                    if (Ltarg.nodeType == 3) { // defeat Safari bug
                        Ltarg = Ltarg.parentNode;
                    }
                    var LfocusTarg = Ltarg;
                    // Ensure that focussed element is visible above the keyboard
                    if (Ltarg.className == null || Ltarg.className.indexOf('keymanweb-input') < 0) {
                        if (this instanceof DOMTouchHandlers) {
                            this.scrollBody(Ltarg);
                        }
                    }
                    if (Ltarg.ownerDocument && Ltarg instanceof Ltarg.ownerDocument.defaultView.HTMLIFrameElement) { //**TODO: check case reference
                        this.keyman.domManager._AttachToIframe(Ltarg);
                        Ltarg = Ltarg.contentWindow.document;
                    }
                    //??keymanweb._Selection = null;
                    // We condition on 'priorElement' below as a check to allow KMW to set a default active keyboard.
                    var priorElement = DOMEventHandlers.states.lastActiveElement;
                    DOMEventHandlers.states.lastActiveElement = Ltarg;
                    if (this.keyman.uiManager.justActivated) {
                        this._BlurKeyboardSettings();
                    }
                    else {
                        this._FocusKeyboardSettings(priorElement ? false : true);
                    }
                    // Always do the common focus stuff, instantly returning if we're in an editable iframe.
                    if (this._CommonFocusHelper(Ltarg)) {
                        return true;
                    }
                    ;
                    Ltarg._KeymanWebSelectionStart = Ltarg._KeymanWebSelectionEnd = null; // I3363 (Build 301)
                    // Set element directionality (but only if element is empty)
                    if (Ltarg.ownerDocument && Ltarg instanceof Ltarg.ownerDocument.defaultView.HTMLElement) {
                        this.keyman.domManager._SetTargDir(Ltarg);
                    }
                    //Execute external (UI) code needed on focus if required
                    this.doControlFocused(LfocusTarg, DOMEventHandlers.states.lastActiveElement);
                    // Force display of OSK for touch input device, or if a CJK keyboard, to ensure visibility of pick list
                    if (device.touchable) {
                        osk._Enabled = 1;
                    }
                    else {
                        // Conditionally show the OSK when control receives the focus
                        if (osk.ready) {
                            if (this.keyman.keyboardManager.isCJK()) {
                                osk._Enabled = 1;
                            }
                            if (osk._Enabled) {
                                osk._Show();
                            }
                            else {
                                osk._Hide(false);
                            }
                        }
                    }
                    return true;
                }.bind(this);
                /**
                 * Respond to KMW losing focus on event
                 */
                this._ControlBlur = function (e) {
                    var Ltarg;
                    e = this.keyman._GetEventObject(e); // I2404 - Manage IE events in IFRAMEs
                    Ltarg = this.keyman.util.eventTarget(e);
                    if (Ltarg == null) {
                        return true;
                    }
                    DOMEventHandlers.states.activeElement = null; // I3363 (Build 301)
                    // Hide the touch device input caret, if applicable  I3363 (Build 301)
                    if (this instanceof DOMTouchHandlers) {
                        this.hideCaret();
                    }
                    if (Ltarg.nodeType == 3) { // defeat Safari bug
                        Ltarg = Ltarg.parentNode;
                    }
                    if (Ltarg.ownerDocument) {
                        if (Ltarg instanceof Ltarg.ownerDocument.defaultView.HTMLIFrameElement) {
                            Ltarg = Ltarg.contentWindow.document;
                        }
                        if (Ltarg instanceof Ltarg.ownerDocument.defaultView.HTMLInputElement
                            || Ltarg instanceof Ltarg.ownerDocument.defaultView.HTMLTextAreaElement) {
                            //Ltarg._KeymanWebSelectionStart = Ltarg.selectionStart;
                            //Ltarg._KeymanWebSelectionEnd = Ltarg.selectionEnd;
                            Ltarg._KeymanWebSelectionStart = Ltarg.value._kmwCodeUnitToCodePoint(Ltarg.selectionStart); //I3319
                            Ltarg._KeymanWebSelectionEnd = Ltarg.value._kmwCodeUnitToCodePoint(Ltarg.selectionEnd); //I3319
                        }
                    }
                    ////keymanweb._SelectionControl = null;    
                    this._BlurKeyboardSettings();
                    // Now that we've handled all prior-element maintenance, update the 'last active element'.
                    DOMEventHandlers.states.lastActiveElement = Ltarg;
                    /* If the KeymanWeb UI is active as a user changes controls, all UI-based effects should be restrained to this control in case
                    * the user is manually specifying languages on a per-control basis.
                    */
                    this.keyman.uiManager.justActivated = false;
                    var isActivating = this.keyman.uiManager.isActivating;
                    if (!isActivating) {
                        this.keyman.keyboardManager.notifyKeyboard(0, Ltarg, 0); // I2187
                    }
                    //e = this.keyman._GetEventObject<FocusEvent>(e);   // I2404 - Manage IE events in IFRAMEs  //TODO: is this really needed again????
                    this.doControlBlurred(Ltarg, e, isActivating);
                    // Hide the OSK when the control is blurred, unless the UI is being temporarily selected
                    if (this.keyman.osk.ready && !isActivating) {
                        this.keyman.osk._Hide(false);
                    }
                    this.doChangeEvent(Ltarg);
                    this.keyman.interface.resetContext();
                    return true;
                }.bind(this);
                /**
                 * Function   _SelectionChange
                 * Scope      Private
                 * Description Respond to selection change event
                 */
                this._SelectionChange = function () {
                    if (DOMEventHandlers.states._IgnoreNextSelChange) {
                        DOMEventHandlers.states._IgnoreNextSelChange--;
                    }
                    return true;
                }.bind(this);
                /**
                 * Function     _KeyDown
                 * Scope        Private
                 * Description  Processes keydown event and passes data to keyboard.
                 *
                 * Note that the test-case oriented 'recorder' stubs this method to facilitate keystroke
                 * recording for use in test cases.  If changing this function, please ensure the recorder is
                 * not affected.
                 */
                this._KeyDown = function (e) {
                    var Ldv, eClass = '';
                    var activeKeyboard = this.keyman.keyboardManager.activeKeyboard;
                    var osk = this.keyman.osk;
                    var util = this.keyman.util;
                    var kbdInterface = this.keyman['interface'];
                    DOMEventHandlers.states._KeyPressToSwallow = 0;
                    if (DOMEventHandlers.states._DisableInput || activeKeyboard == null) {
                        return true;
                    }
                    // Prevent mapping element is readonly or tagged as kmw-disabled
                    var el = util.eventTarget(e);
                    if (util.device.touchable) {
                        if (el && typeof el.kmwInput != 'undefined' && el.kmwInput == false) {
                            return true;
                        }
                    }
                    else if (el && el.className.indexOf('kmw-disabled') >= 0) {
                        return true;
                    }
                    // Or if OSK not yet ready (for any reason)
                    if (!osk.ready) {
                        return true;
                    }
                    // Get event properties  
                    var Levent = this._GetKeyEventProperties(e, true);
                    if (Levent == null) {
                        return true;
                    }
                    switch (Levent.Lcode) {
                        case 8:
                            kbdInterface.clearDeadkeys();
                            break; // I3318 (always clear deadkeys after backspace) 
                        case 16: //"K_SHIFT":16,"K_CONTROL":17,"K_ALT":18
                        case 17:
                        case 18:
                        case 20: //"K_CAPS":20, "K_NUMLOCK":144,"K_SCROLL":145
                        case 144:
                        case 145:
                            // For eventual integration - we bypass an OSK update for physical keystrokes when in touch mode.
                            this.keyman.keyboardManager.notifyKeyboard(Levent.Lcode, Levent.Ltarg, 1);
                            if (!util.device.touchable) {
                                return osk._UpdateVKShift(Levent, Levent.Lcode - 15, 1); // I2187
                            }
                            else {
                                return true;
                            }
                    }
                    if (Levent.LmodifierChange) {
                        this.keyman.keyboardManager.notifyKeyboard(0, Levent.Ltarg, 1);
                        osk._UpdateVKShift(Levent, 0, 1);
                    }
                    if (!window.event) {
                        // I1466 - Convert the - keycode on mnemonic as well as positional layouts
                        // FireFox, Mozilla Suite
                        if (this.keyman.keyMapManager.browserMap.FF['k' + Levent.Lcode]) {
                            Levent.Lcode = this.keyman.keyMapManager.browserMap.FF['k' + Levent.Lcode];
                        }
                    }
                    //else 
                    //{
                    // Safari, IE, Opera?
                    //}
                    if (!activeKeyboard['KM']) {
                        // Positional Layout
                        var LeventMatched = 0;
                        /* 13/03/2007 MCD: Swedish: Start mapping of keystroke to US keyboard */
                        var Lbase = this.keyman.keyMapManager.languageMap[osk._BaseLayout];
                        if (Lbase && Lbase['k' + Levent.Lcode]) {
                            Levent.Lcode = Lbase['k' + Levent.Lcode];
                        }
                        /* 13/03/2007 MCD: Swedish: End mapping of keystroke to US keyboard */
                        if (typeof (activeKeyboard['KM']) == 'undefined' && !(Levent.Lmodifiers & 0x60)) {
                            // Support version 1.0 KeymanWeb keyboards that do not define positional vs mnemonic
                            var Levent2 = {
                                Lcode: this.keyman.keyMapManager._USKeyCodeToCharCode(Levent),
                                Ltarg: Levent.Ltarg,
                                Lmodifiers: 0,
                                LisVirtualKey: 0
                            };
                            if (kbdInterface.processKeystroke(util.physicalDevice, Levent2.Ltarg, Levent2)) {
                                LeventMatched = 1;
                            }
                        }
                        LeventMatched = LeventMatched || kbdInterface.processKeystroke(util.physicalDevice, Levent.Ltarg, Levent);
                        // Support backspace in simulated input DIV from physical keyboard where not matched in rule  I3363 (Build 301)
                        if (Levent.Lcode == 8 && !LeventMatched && Levent.Ltarg.className != null && Levent.Ltarg.className.indexOf('keymanweb-input') >= 0) {
                            this.keyman.interface.defaultBackspace();
                        }
                    }
                    else {
                        // Mnemonic layout
                        if (Levent.Lcode == 8) { // I1595 - Backspace for mnemonic
                            DOMEventHandlers.states._KeyPressToSwallow = 1;
                            if (!kbdInterface.processKeystroke(util.physicalDevice, Levent.Ltarg, Levent)) {
                                this.keyman.interface.defaultBackspace(); // I3363 (Build 301)
                            }
                            return false; //added 16/3/13 to fix double backspace on mnemonic layouts on desktop
                        }
                        else {
                            DOMEventHandlers.states._KeyPressToSwallow = 0;
                            LeventMatched = LeventMatched || kbdInterface.processKeystroke(util.physicalDevice, Levent.Ltarg, Levent);
                        }
                    }
                    if (!LeventMatched && Levent.Lcode >= 96 && Levent.Lcode <= 111 && !activeKeyboard['KM']) {
                        // Number pad, numlock on
                        //      _Debug('KeyPress NumPad code='+Levent.Lcode+'; Ltarg='+Levent.Ltarg.tagName+'; LisVirtualKey='+Levent.LisVirtualKey+'; _KeyPressToSwallow='+keymanweb._KeyPressToSwallow+'; keyCode='+(e?e.keyCode:'nothing'));
                        if (Levent.Lcode < 106) {
                            var Lch = Levent.Lcode - 48;
                        }
                        else {
                            Lch = Levent.Lcode - 64;
                        }
                        kbdInterface.output(0, Levent.Ltarg, String._kmwFromCharCode(Lch)); //I3319
                        LeventMatched = 1;
                    }
                    if (LeventMatched) {
                        if (e && e.preventDefault) {
                            e.preventDefault();
                            e.stopPropagation();
                        }
                        DOMEventHandlers.states._KeyPressToSwallow = (e ? this._GetEventKeyCode(e) : 0);
                        return false;
                    }
                    else {
                        DOMEventHandlers.states._KeyPressToSwallow = 0;
                    }
                    if (Levent.Lcode == 8) {
                        /* Backspace - delete deadkeys, also special rule if desired? */
                        // This is needed to prevent jumping to previous page, but why???  // I3363 (Build 301)
                        if (Levent.Ltarg.className != null && Levent.Ltarg.className.indexOf('keymanweb-input') >= 0) {
                            return false;
                        }
                    }
                    if (typeof (Levent.Ltarg.base) != 'undefined') {
                        // Simulated touch elements have no default text-processing - we need to rely on a strategy similar to
                        // that of the OSK here.
                        var ch = osk.defaultKeyOutput('', Levent.Lcode, Levent.Lmodifiers, false, Levent.Ltarg);
                        if (ch) {
                            kbdInterface.output(0, Levent.Ltarg, ch);
                            return false;
                        }
                    }
                    return true;
                }.bind(this);
                /**
                 * Function     _KeyPress
                 * Scope        Private
                 * Description Processes keypress event (does not pass data to keyboard)
                 */
                this._KeyPress = function (e) {
                    var Levent;
                    if (DOMEventHandlers.states._DisableInput || this.keyman.keyboardManager.activeKeyboard == null) {
                        return true;
                    }
                    Levent = this._GetKeyEventProperties(e);
                    if (Levent == null || Levent.LisVirtualKey) {
                        return true;
                    }
                    // _Debug('KeyPress code='+Levent.Lcode+'; Ltarg='+Levent.Ltarg.tagName+'; LisVirtualKey='+Levent.LisVirtualKey+'; _KeyPressToSwallow='+keymanweb._KeyPressToSwallow+'; keyCode='+(e?e.keyCode:'nothing'));
                    /* I732 START - 13/03/2007 MCD: Swedish: Start positional keyboard layout code: prevent keystroke */
                    if (!this.keyman.keyboardManager.activeKeyboard['KM']) {
                        if (!DOMEventHandlers.states._KeyPressToSwallow) {
                            return true;
                        }
                        if (Levent.Lcode < 0x20 || (this.keyman._BrowserIsSafari && (Levent.Lcode > 0xF700 && Levent.Lcode < 0xF900))) {
                            return true;
                        }
                        e = this.keyman._GetEventObject(e); // I2404 - Manage IE events in IFRAMEs
                        if (e) {
                            e.returnValue = false;
                        }
                        return false;
                    }
                    /* I732 END - 13/03/2007 MCD: Swedish: End positional keyboard layout code */
                    if (DOMEventHandlers.states._KeyPressToSwallow || this.keyman['interface'].processKeystroke(this.keyman.util.physicalDevice, Levent.Ltarg, Levent)) {
                        DOMEventHandlers.states._KeyPressToSwallow = 0;
                        if (e && e.preventDefault) {
                            e.preventDefault();
                            e.stopPropagation();
                        }
                        return false;
                    }
                    DOMEventHandlers.states._KeyPressToSwallow = 0;
                    return true;
                }.bind(this);
                /**
                 * Function     _KeyUp
                 * Scope        Private
                 * Description Processes keyup event and passes event data to keyboard
                 */
                this._KeyUp = function (e) {
                    var keyboardManager = this.keyman.keyboardManager;
                    var osk = this.keyman.osk;
                    var Levent = this._GetKeyEventProperties(e, false);
                    if (Levent == null || !osk.ready) {
                        return true;
                    }
                    switch (Levent.Lcode) {
                        case 13:
                            if (Levent.Ltarg instanceof Levent.Ltarg.ownerDocument.defaultView.HTMLTextAreaElement) {
                                break;
                            }
                            if (Levent.Ltarg.base && Levent.Ltarg.base instanceof Levent.Ltarg.base.ownerDocument.defaultView.HTMLTextAreaElement) {
                                break;
                            }
                            // For input fields, move to next input element
                            if (Levent.Ltarg instanceof Levent.Ltarg.ownerDocument.defaultView.HTMLInputElement) {
                                var inputEle = Levent.Ltarg;
                                if (inputEle.type == 'search' || inputEle.type == 'submit') {
                                    inputEle.form.submit();
                                }
                                else {
                                    this.keyman.domManager.moveToNext(false);
                                }
                            }
                            return true;
                        case 16: //"K_SHIFT":16,"K_CONTROL":17,"K_ALT":18
                        case 17:
                        case 18:
                        case 20: //"K_CAPS":20, "K_NUMLOCK":144,"K_SCROLL":145
                        case 144:
                        case 145:
                            keyboardManager.notifyKeyboard(Levent.Lcode, Levent.Ltarg, 0);
                            if (!this.keyman.util.device.touchable) {
                                return osk._UpdateVKShift(Levent, Levent.Lcode - 15, 1); // I2187
                            }
                            else {
                                return true;
                            }
                    }
                    if (Levent.LmodifierChange) {
                        keyboardManager.notifyKeyboard(0, Levent.Ltarg, 0);
                        osk._UpdateVKShift(Levent, 0, 1); // I2187
                    }
                    return false;
                }.bind(this);
                this.keyman = keyman;
            }
            /**
             * Get simulated input field content
             *
             * @param       {Object}        e     element (object) of simulated input field
             * @return      {string}              entire text in simulated input field
             */
            DOMEventHandlers.prototype.getText = function (e) {
                // Touch-only method.
                return '';
            };
            /**
             *Insert text into simulated input field at indicated character position
              *
              * @param       {Object}      e     simulated input field DIV
              * @param       {?string}     t     text to insert in element
              * @param       {?number}     cp    caret position (characters)
              */
            DOMEventHandlers.prototype.setText = function (e, t, cp) {
                // Touch-only method.
            };
            /**
             * Get text up to the caret from simulated input field
             *
             * @return      {string}
             */
            DOMEventHandlers.prototype.getTextBeforeCaret = function (e) {
                // Touch-only method.
                return '';
            };
            /**
             * Replace text up to the caret in the simulated input field
             *
             * @param       {Object}        e     element (object) of simulated input field
             * @param       {string}        t     Context for simulated input field
             */
            DOMEventHandlers.prototype.setTextBeforeCaret = function (e, t) {
                // Touch-only method.
            };
            /**
             * Description  Get current position of caret in simulated input field
             *
             * @param       {Object}        e     element (object) of simulated input field
             * @return      {number}              caret character position in simulated input field
             */
            DOMEventHandlers.prototype.getTextCaret = function (e) {
                // Touch-only method.
                return 0;
            };
            /**
             * Set current position of caret in simulated input field then display the caret
             *
             * @param       {Object}        e     element (object) of simulated input field
             * @param       {number}        cp    caret character position in simulated input field
             */
            DOMEventHandlers.prototype.setTextCaret = function (e, cp) {
                // Touch-only method.
            };
            /**
             * Hides the simulated caret for touch-aliased elements.
             */
            DOMEventHandlers.prototype.hideCaret = function () {
                // Touch-only method.
            };
            /**
             * Correct the position and size of a duplicated input element
             *
             * @param       {Object}        x     element
             */
            DOMEventHandlers.prototype.updateInput = function (x) {
                // Touch-only method.
            };
            /**
             * Function     doControlFocused
             * Scope        Private
             * @param       {Object}            _target         element gaining focus
             * @param       {Object}            _activeControl  currently active control
             * @return      {boolean}
             * Description  Execute external (UI) code needed on focus
             */
            DOMEventHandlers.prototype.doControlFocused = function (_target, _activeControl) {
                var p = {};
                p['target'] = _target;
                p['activeControl'] = _activeControl;
                return this.keyman.util.callEvent('kmw.controlfocused', p);
            };
            /**
             * Function     doControlBlurred
             * Scope        Private
             * @param       {Object}            _target       element losing focus
             * @param       {Event}             _event        event object
             * @param       {(boolean|number)}  _isActivating activation state
             * @return      {boolean}
             * Description  Execute external (UI) code needed on blur
             */
            DOMEventHandlers.prototype.doControlBlurred = function (_target, _event, _isActivating) {
                var p = {};
                p['target'] = _target;
                p['event'] = _event;
                p['isActivating'] = _isActivating;
                return this.keyman.util.callEvent('kmw.controlblurred', p);
            };
            /**
             * Function             _BlurKeyboardSettings
             * Description          Stores the last active element's keyboard settings.  Should be called
             *                      whenever a KMW-enabled page element loses control.
             */
            DOMEventHandlers.prototype._BlurKeyboardSettings = function (PInternalName, PLgCode) {
                var keyboardID = this.keyman.keyboardManager.activeKeyboard ? this.keyman.keyboardManager.activeKeyboard['KI'] : '';
                var langCode = this.keyman.keyboardManager.getActiveLanguage();
                if (PInternalName !== undefined && PLgCode !== undefined) {
                    keyboardID = PInternalName;
                    langCode = PLgCode;
                }
                var lastElem = DOMEventHandlers.states.lastActiveElement;
                if (lastElem && lastElem._kmwAttachment.keyboard != null) {
                    lastElem._kmwAttachment.keyboard = keyboardID;
                    lastElem._kmwAttachment.languageCode = langCode;
                }
                else {
                    this.keyman.globalKeyboard = keyboardID;
                    this.keyman.globalLanguageCode = langCode;
                }
            };
            /**
             * Function             _FocusKeyboardSettings
             * @param   {boolean}   blockGlobalChange   A flag indicating if the global keyboard setting should be ignored for this call.
             * Description          Restores the newly active element's keyboard settings.  Should be called
             *                      whenever a KMW-enabled page element gains control, but only once the prior
             *                      element's loss of control is guaranteed.
             */
            DOMEventHandlers.prototype._FocusKeyboardSettings = function (blockGlobalChange) {
                var lastElem = DOMEventHandlers.states.lastActiveElement;
                if (lastElem && lastElem._kmwAttachment.keyboard != null) {
                    this.keyman.keyboardManager.setActiveKeyboard(lastElem._kmwAttachment.keyboard, lastElem._kmwAttachment.languageCode);
                }
                else if (!blockGlobalChange) {
                    this.keyman.keyboardManager.setActiveKeyboard(this.keyman.globalKeyboard, this.keyman.globalLanguageCode);
                }
            };
            /**
             * Function             _CommonFocusHelper
             * @param   {Element}   target
             * @returns {boolean}
             * Description          Performs common state management for the various focus events of KeymanWeb.
             *                      The return value indicates whether (true) or not (false) the calling event handler
             *                      should be terminated immediately after the call.
             */
            DOMEventHandlers.prototype._CommonFocusHelper = function (target) {
                var uiManager = this.keyman.uiManager;
                //TODO: the logic of the following line doesn't look right!!  Both variables are true, but that doesn't make sense!
                //_Debug(keymanweb._IsIEEditableIframe(Ltarg,1) + '...' +keymanweb._IsMozillaEditableIframe(Ltarg,1));
                if (target.ownerDocument && target instanceof target.ownerDocument.defaultView.HTMLIFrameElement) {
                    if (!this.keyman.domManager._IsIEEditableIframe(target, 1) ||
                        !this.keyman.domManager._IsMozillaEditableIframe(target, 1)) {
                        DOMEventHandlers.states._DisableInput = true;
                        return true;
                    }
                }
                DOMEventHandlers.states._DisableInput = false;
                if (!uiManager.justActivated) {
                    // Needs refactor when the Callbacks interface PR goes through!
                    this.keyman['interface']._DeadKeys = [];
                    this.keyman.keyboardManager.notifyKeyboard(0, target, 1); // I2187
                }
                if (!uiManager.justActivated && DOMEventHandlers.states._SelectionControl != target) {
                    uiManager.isActivating = false;
                }
                uiManager.justActivated = false;
                DOMEventHandlers.states._SelectionControl = target;
                return false;
            };
            /**
             * Function     _GetEventKeyCode
             * Scope        Private
             * @param       {Event}       e         Event object
             * Description  Finds the key code represented by the event.
             */
            DOMEventHandlers.prototype._GetEventKeyCode = function (e) {
                if (e.keyCode) {
                    return e.keyCode;
                }
                else if (e.which) {
                    return e.which;
                }
                else {
                    return null;
                }
            };
            /**
             * Function     _GetKeyEventProperties
             * Scope        Private
             * @param       {Event}       e         Event object
             * @param       {boolean=}    keyState  true if call results from a keyDown event, false if keyUp, undefined if keyPress
             * @return      {Object.<string,*>}     KMW keyboard event object:
             * Description  Get object with target element, key code, shift state, virtual key state
             *                Ltarg=target element
             *                Lcode=keyCode
             *                Lmodifiers=shiftState
             *                LisVirtualKeyCode e.g. ctrl/alt key
             *                LisVirtualKey     e.g. Virtual key or non-keypress event
             */
            DOMEventHandlers.prototype._GetKeyEventProperties = function (e, keyState) {
                var s = new com.keyman.KeyEvent();
                e = this.keyman._GetEventObject(e); // I2404 - Manage IE events in IFRAMEs
                s.Ltarg = this.keyman.util.eventTarget(e);
                if (s.Ltarg == null) {
                    return null;
                }
                if (e.cancelBubble === true) {
                    return null; // I2457 - Facebook meta-event generation mess -- two events generated for a keydown in Facebook contentEditable divs
                }
                if (s.Ltarg.nodeType == 3) { // defeat Safari bug
                    s.Ltarg = s.Ltarg.parentNode;
                }
                s.Lcode = this._GetEventKeyCode(e);
                if (s.Lcode == null) {
                    return null;
                }
                var osk = this.keyman.osk, activeKeyboard = this.keyman.keyboardManager.activeKeyboard;
                if (activeKeyboard && activeKeyboard['KM']) {
                    // K_SPACE is not handled by defaultKeyOutput for physical keystrokes unless using touch-aliased elements.
                    if (s.Lcode != osk.keyCodes['K_SPACE']) {
                        // So long as the key name isn't prefixed with 'U_', we'll get a default mapping based on the Lcode value.
                        // We need to determine the mnemonic base character - for example, SHIFT + K_PERIOD needs to map to '>'.
                        var mappedChar = osk.defaultKeyOutput('K_xxxx', s.Lcode, (e.getModifierState("Shift") ? 0x10 : 0), false, null);
                        if (mappedChar) {
                            s.Lcode = mappedChar.charCodeAt(0);
                        } // No 'else' - avoid blocking modifier keys, etc.
                    }
                }
                // Stage 1 - track the true state of the keyboard's modifiers.
                var prevModState = DOMEventHandlers.states.modStateFlags, curModState = 0x0000;
                var ctrlEvent = false, altEvent = false;
                switch (s.Lcode) {
                    case osk.keyCodes['K_CTRL']: // The 3 shorter "K_*CTRL" entries exist in some legacy keyboards.
                    case osk.keyCodes['K_LCTRL']:
                    case osk.keyCodes['K_RCTRL']:
                    case osk.keyCodes['K_CONTROL']:
                    case osk.keyCodes['K_LCONTROL']:
                    case osk.keyCodes['K_RCONTROL']:
                        ctrlEvent = true;
                        break;
                    case osk.keyCodes['K_LMENU']: // The 2 "K_*MENU" entries exist in some legacy keyboards.
                    case osk.keyCodes['K_RMENU']:
                    case osk.keyCodes['K_ALT']:
                    case osk.keyCodes['K_LALT']:
                    case osk.keyCodes['K_RALT']:
                        altEvent = true;
                        break;
                }
                /**
                 * Two separate conditions exist that should trigger chiral modifier detection.  Examples below use CTRL but also work for ALT.
                 *
                 * 1.  The user literally just pressed CTRL, so the event has a valid `location` property we can utilize.
                 *     Problem: its layer isn't presently activated within the OSK.
                 *
                 * 2.  CTRL has been held a while, so the OSK layer is valid, but the key event doesn't tell us the chirality of the active CTRL press.
                 *     Bonus issue:  RAlt simulation may cause erasure of this location property, but it should ONLY be empty if pressed in this case.
                 *     We default to the 'left' variants since they're more likely to exist and cause less issues with RAlt simulation handling.
                 *
                 * In either case, `e.getModifierState("Control")` is set to true, but as a result does nothing to tell us which case is active.
                 *
                 * `e.location != 0` if true matches condition 1 and matches condition 2 if false.
                 */
                curModState |= (e.getModifierState("Shift") ? 0x10 : 0);
                if (e.getModifierState("Control")) {
                    curModState |= ((e.location != 0 && ctrlEvent) ?
                        (e.location == 1 ? osk.modifierCodes['LCTRL'] : osk.modifierCodes['RCTRL']) : // Condition 1
                        prevModState & 0x0003); // Condition 2
                }
                if (e.getModifierState("Alt")) {
                    curModState |= ((e.location != 0 && altEvent) ?
                        (e.location == 1 ? osk.modifierCodes['LALT'] : osk.modifierCodes['RALT']) : // Condition 1
                        prevModState & 0x000C); // Condition 2
                }
                // Stage 2 - detect state key information.  It can be looked up per keypress with no issue.
                s.Lstates = 0;
                if (e.getModifierState("CapsLock")) {
                    s.Lstates = osk.modifierCodes['CAPS'];
                }
                else {
                    s.Lstates = osk.modifierCodes['NO_CAPS'];
                }
                if (e.getModifierState("NumLock")) {
                    s.Lstates |= osk.modifierCodes['NUM_LOCK'];
                }
                else {
                    s.Lstates |= osk.modifierCodes['NO_NUM_LOCK'];
                }
                if (e.getModifierState("ScrollLock") || e.getModifierState("Scroll")) { // "Scroll" for IE9.
                    s.Lstates |= osk.modifierCodes['SCROLL_LOCK'];
                }
                else {
                    s.Lstates |= osk.modifierCodes['NO_SCROLL_LOCK'];
                }
                // We need these states to be tracked as well for proper OSK updates.
                curModState |= s.Lstates;
                // Stage 3 - Set our modifier state tracking variable and perform basic AltGr-related management.
                s.LmodifierChange = DOMEventHandlers.states.modStateFlags != curModState;
                DOMEventHandlers.states.modStateFlags = curModState;
                // Flip the shift bit if Caps Lock is active on mnemonic keyboards.
                // Avoid signaling a change in the shift key's modifier state.  (The reason for this block's positioning.)
                if (activeKeyboard && activeKeyboard['KM'] && e.getModifierState("CapsLock")) {
                    if ((s.Lcode >= 65 && s.Lcode <= 90) /* 'A' - 'Z' */ || (s.Lcode >= 97 && s.Lcode <= 122) /* 'a' - 'z' */) {
                        curModState ^= 0x10; // Flip the 'shift' bit.
                        s.Lcode ^= 0x20; // Flips the 'upper' vs 'lower' bit for the base 'a'-'z' ASCII alphabetics.
                    }
                }
                // For European keyboards, not all browsers properly send both key-up events for the AltGr combo.
                var altGrMask = osk.modifierCodes['RALT'] | osk.modifierCodes['LCTRL'];
                if ((prevModState & altGrMask) == altGrMask && (curModState & altGrMask) != altGrMask) {
                    // We just released AltGr - make sure it's all released.
                    curModState &= ~altGrMask;
                }
                // Perform basic filtering for Windows-based ALT_GR emulation on European keyboards.
                if (curModState & osk.modifierCodes['RALT']) {
                    curModState &= ~osk.modifierCodes['LCTRL'];
                }
                // Stage 4 - map the modifier set to the appropriate keystroke's modifiers.
                if (this.keyman.keyboardManager.isChiral()) {
                    s.Lmodifiers = curModState & osk.modifierBitmasks.CHIRAL;
                    // Note for future - embedding a kill switch here or in keymanweb.osk.emulatesAltGr would facilitate disabling
                    // AltGr / Right-alt simulation.
                    if (osk.emulatesAltGr() && (s.Lmodifiers & osk.modifierBitmasks['ALT_GR_SIM']) == osk.modifierBitmasks['ALT_GR_SIM']) {
                        s.Lmodifiers ^= osk.modifierBitmasks['ALT_GR_SIM'];
                        s.Lmodifiers |= osk.modifierCodes['RALT'];
                    }
                }
                else {
                    // No need to sim AltGr here; we don't need chiral ALTs.
                    s.Lmodifiers =
                        (curModState & 0x10) | // SHIFT
                            ((curModState & (osk.modifierCodes['LCTRL'] | osk.modifierCodes['RCTRL'])) ? 0x20 : 0) |
                            ((curModState & (osk.modifierCodes['LALT'] | osk.modifierCodes['RALT'])) ? 0x40 : 0);
                }
                // The 0x6F used to be 0x60 - this adjustment now includes the chiral alt and ctrl modifiers in that check.
                s.LisVirtualKeyCode = (typeof e.charCode != 'undefined' && e.charCode != null && (e.charCode == 0 || (s.Lmodifiers & 0x6F) != 0));
                s.LisVirtualKey = s.LisVirtualKeyCode || e.type != 'keypress';
                return s;
            };
            DOMEventHandlers.prototype.doChangeEvent = function (_target) {
                if (DOMEventHandlers.states.changed) {
                    var event;
                    if (typeof Event == 'function') {
                        event = new Event('change', { "bubbles": true, "cancelable": false });
                    }
                    else { // IE path
                        event = document.createEvent("HTMLEvents");
                        event.initEvent('change', true, false);
                    }
                    // Ensure that touch-aliased elements fire as if from the aliased element.
                    if (_target['base'] && _target['base']['kmw_ip']) {
                        _target = _target['base'];
                    }
                    _target.dispatchEvent(event);
                }
                DOMEventHandlers.states.changed = false;
            };
            // This is only static within a given initialization of KeymanWeb.  Perhaps it would be best as an initialization 
            // parameter and member field?
            DOMEventHandlers.states = new CommonDOMStates();
            return DOMEventHandlers;
        }());
        keyman_1.DOMEventHandlers = DOMEventHandlers;
        // -------------------------------------------------------------------------
        /**
         * Defines numerous functions for handling and modeling touch-based aliases.
         */
        var DOMTouchHandlers = /** @class */ (function (_super) {
            __extends(DOMTouchHandlers, _super);
            function DOMTouchHandlers(keyman) {
                var _this = _super.call(this, keyman) || this;
                /**
                 * Handle receiving focus by simulated input field
                 *
                 */
                _this.setFocus = function (e) {
                    var kmw = this.keyman;
                    var osk = this.keyman.osk;
                    var util = this.keyman.util;
                    DOMEventHandlers.states.setFocusTimer();
                    var tEvent;
                    if (keyman_1.Util.instanceof(e, "TouchEvent")) {
                        tEvent = e.touches[0];
                    }
                    else { // Allow external code to set focus and thus display the OSK on touch devices if required (KMEW-123)
                        tEvent = { clientX: 0, clientY: 0 };
                        // Will usually be called from setActiveElement, which should define DOMEventHandlers.states.lastActiveElement
                        if (DOMEventHandlers.states.lastActiveElement) {
                            tEvent.target = DOMEventHandlers.states.lastActiveElement['kmw_ip'];
                            // but will default to first input or text area on page if DOMEventHandlers.states.lastActiveElement is null
                        }
                        else {
                            tEvent.target = this.keyman.domManager.sortedInputs[0]['kmw_ip'];
                        }
                    }
                    var touchX = tEvent.clientX, touchY = tEvent.clientY;
                    var tTarg = tEvent.target;
                    var scroller;
                    // Identify the scroller element
                    if (keyman_1.Util.instanceof(tTarg, "HTMLSpanElement")) {
                        scroller = tTarg.parentNode;
                    }
                    else if (tTarg.className != null && tTarg.className.indexOf('keymanweb-input') >= 0) {
                        scroller = tTarg.firstChild;
                    }
                    else {
                        scroller = tTarg;
                    }
                    // And the actual target element        
                    var target = scroller.parentNode;
                    // Move the caret and refocus if necessary     
                    if (DOMEventHandlers.states.activeElement != target) {
                        // Hide the KMW caret
                        this.hideCaret();
                        DOMEventHandlers.states.activeElement = target;
                        // The issue here is that touching a DIV does not actually set the focus for iOS, even when enabled to accept focus (by setting tabIndex=0)
                        // We must explicitly set the focus in order to remove focus from any non-KMW input
                        target.focus(); //Android native browsers may not like this, but it is needed for Chrome, Safari
                    }
                    // Correct element directionality if required
                    this.keyman.domManager._SetTargDir(target);
                    // What we really want to do is to blur any active element that is not a KMW input, 
                    // but the following line does not work as might be expected, even though the correct element is referenced.
                    // It is as though blur is ignored if focus is supposed to have been moved, even if it has not in fact been moved?
                    //if(document.activeElement.nodeName != 'DIV' && document.activeElement.nodeName != 'BODY') document.activeElement.blur();
                    // And display the OSK if not already visible
                    if (osk.ready && !osk._Visible) {
                        osk._Show();
                    }
                    // If clicked on DIV, set caret to end of text
                    if (keyman_1.Util.instanceof(tTarg, "HTMLDivElement")) {
                        var x, cp;
                        x = util._GetAbsoluteX(scroller.firstChild);
                        if (target.dir == 'rtl') {
                            x += scroller.firstChild.offsetWidth;
                            cp = (touchX > x ? 0 : 100000);
                        }
                        else {
                            cp = (touchX < x ? 0 : 100000);
                        }
                        this.setTextCaret(target, cp);
                        this.scrollInput(target);
                    }
                    else { // Otherwise, if clicked on text in SPAN, set at touch position
                        var caret, cp, cpMin, cpMax, x, y, dy, yRow, iLoop;
                        caret = scroller.childNodes[1]; //caret span
                        cpMin = 0;
                        cpMax = this.getText(target)._kmwLength();
                        cp = this.getTextCaret(target);
                        dy = document.body.scrollTop;
                        // Vertical scrolling
                        if (target.base instanceof target.base.ownerDocument.defaultView.HTMLTextAreaElement) {
                            yRow = Math.round(target.base.offsetHeight / target.base.rows);
                            for (iLoop = 0; iLoop < 16; iLoop++) {
                                y = util._GetAbsoluteY(caret) - dy; //top of caret            
                                if (y > touchY && cp > cpMin && cp != cpMax) {
                                    cpMax = cp;
                                    cp = Math.round((cp + cpMin) / 2);
                                }
                                else if (y < touchY - yRow && cp < cpMax && cp != cpMin) {
                                    cpMin = cp;
                                    cp = Math.round((cp + cpMax) / 2);
                                }
                                else
                                    break;
                                this.setTextCaret(target, cp);
                            }
                            while (util._GetAbsoluteY(caret) - dy > touchY && cp > cpMin) {
                                this.setTextCaret(target, --cp);
                            }
                            while (util._GetAbsoluteY(caret) - dy < touchY - yRow && cp < cpMax) {
                                this.setTextCaret(target, ++cp);
                            }
                        }
                        // Caret repositioning for horizontal scrolling of RTL text
                        // snapOrder - 'snaps' the touch location in a manner corresponding to the 'ltr' vs 'rtl' orientation.
                        // Think of it as performing a floor() function, but the floor depends on the origin's direction.
                        var snapOrder;
                        if (target.dir == 'rtl') { // I would use arrow functions, but IE doesn't like 'em.
                            snapOrder = function (a, b) {
                                return a < b;
                            };
                        }
                        else {
                            snapOrder = function (a, b) {
                                return a > b;
                            };
                        }
                        for (iLoop = 0; iLoop < 16; iLoop++) {
                            x = util._GetAbsoluteX(caret); //left of caret            
                            if (snapOrder(x, touchX) && cp > cpMin && cp != cpMax) {
                                cpMax = cp;
                                cp = Math.round((cp + cpMin) / 2);
                            }
                            else if (!snapOrder(x, touchX) && cp < cpMax && cp != cpMin) {
                                cpMin = cp;
                                cp = Math.round((cp + cpMax) / 2);
                            }
                            else {
                                break;
                            }
                            this.setTextCaret(target, cp);
                        }
                        while (snapOrder(util._GetAbsoluteX(caret), touchX) && cp > cpMin) {
                            this.setTextCaret(target, --cp);
                        }
                        while (!snapOrder(util._GetAbsoluteX(caret), touchX) && cp < cpMax) {
                            this.setTextCaret(target, ++cp);
                        }
                    }
                    /**
                     * This event will trigger before keymanweb.setBlur is triggered.  Now that we're allowing independent keyboard settings
                     * for controls, we have to act here to preserve the outgoing control's keyboard settings.
                     *
                     * If we 'just activated' the KeymanWeb UI, we need to save the new keyboard change as appropriate.
                     */
                    this._BlurKeyboardSettings();
                    // With the attachment API update, we now directly track the old legacy control behavior.
                    DOMEventHandlers.states.lastActiveElement = target;
                    /**
                     * If we 'just activated' the KeymanWeb UI, we need to save the new keyboard change as appropriate.
                     * If not, we need to activate the control's preferred keyboard.
                     */
                    this._FocusKeyboardSettings(false);
                    // Always do the common focus stuff, instantly returning if we're in an editable iframe.
                    // This parallels the if-statement in _ControlFocus - it may be needed as this if-statement in the future,
                    // despite its present redundancy.
                    if (this._CommonFocusHelper(target)) {
                        return;
                    }
                }.bind(_this);
                _this.flashCaret = function () {
                    if (this.keyman.util.device.touchable && DOMEventHandlers.states.activeElement != null) {
                        var cs = this.caret.style;
                        cs.visibility = cs.visibility != 'visible' ? 'visible' : 'hidden';
                    }
                }.bind(_this);
                /**
                 * Handle losing focus from simulated input field
                 */
                _this.setBlur = function (e) {
                    // This works OK for iOS, but may need something else for other platforms
                    this.keyman.interface.resetContext();
                    if (('relatedTarget' in e) && e.relatedTarget) {
                        var elem = e.relatedTarget;
                        this.doChangeEvent(elem);
                        if (elem.nodeName != 'DIV' || elem.className.indexOf('keymanweb-input') == -1) {
                            this.cancelInput();
                            return;
                        }
                    }
                    //Hide the OSK
                    if (!DOMEventHandlers.states.focusing) {
                        this.cancelInput();
                    }
                }.bind(_this);
                /**
                 * Handle the touch move event for an input element
                 */
                _this.dragInput = function (e) {
                    // Prevent dragging window 
                    e.preventDefault();
                    e.stopPropagation();
                    // Identify the target from the touch list or the event argument (IE 10 only)
                    var target;
                    if (keyman_1.Util.instanceof(e, "TouchEvent")) {
                        target = e.targetTouches[0].target;
                    }
                    else {
                        target = e.target;
                    }
                    if (target == null) {
                        return;
                    }
                    // Identify the input element from the touch event target (touched element may be contained by input)
                    if (target.className == null || target.className.indexOf('keymanweb-input') < 0)
                        target = target.parentNode;
                    if (target.className == null || target.className.indexOf('keymanweb-input') < 0)
                        target = target.parentNode;
                    if (target.className == null || target.className.indexOf('keymanweb-input') < 0)
                        return;
                    var x, y;
                    if (keyman_1.Util.instanceof(e, "TouchEvent")) {
                        x = e.touches[0].screenX;
                        y = e.touches[0].screenY;
                    }
                    else {
                        x = e.screenX;
                        y = e.screenY;
                    }
                    // Allow content of input elements to be dragged horizontally or vertically
                    if (typeof this.firstTouch == 'undefined' || this.firstTouch == null) {
                        this.firstTouch = { x: x, y: y };
                    }
                    else {
                        var x0 = this.firstTouch.x, y0 = this.firstTouch.y, scroller = target.firstChild, dx, dy, x1;
                        if (target.base.nodeName == 'TEXTAREA') {
                            var yOffset = parseInt(scroller.style.top, 10);
                            if (isNaN(yOffset))
                                yOffset = 0;
                            dy = y0 - y;
                            if (dy < -4 || dy > 4) {
                                scroller.style.top = (yOffset < dy ? yOffset - dy : 0) + 'px';
                                this.firstTouch.y = y;
                            }
                        }
                        else {
                            var xOffset = parseInt(scroller.style.left, 10);
                            if (isNaN(xOffset))
                                xOffset = 0;
                            dx = x0 - x;
                            if (dx < -4 || dx > 4) {
                                // Limit dragging beyond the defined text (to avoid dragging the text completely out of view)
                                var xMin = 0, xMax = this.keyman.util._GetAbsoluteX(target) + target.offsetWidth - scroller.offsetWidth - 32;
                                if (target.base.dir == 'rtl')
                                    xMin = 16;
                                else
                                    xMax = xMax - 24;
                                x1 = xOffset - dx;
                                if (x1 > xMin)
                                    x1 = xMin;
                                if (x1 < xMax)
                                    x1 = xMax;
                                scroller.style.left = x1 + 'px';
                                this.firstTouch.x = x;
                            }
                        }
                    }
                    this.setScrollBar(target);
                }.bind(_this);
                _this.initCaret();
                return _this;
            }
            DOMTouchHandlers.prototype.initCaret = function () {
                /**
                 * Create a caret to be appended to the scroller of the focussed input field.
                 * The caret is appended to the scroller so that it will automatically be clipped
                 * when the user manually scrolls it outside the element boundaries.
                 * It is positioned exactly over the hidden span that is inserted between the
                 * text spans before and after the insertion point.
                 */
                this.caret = document.createElement('DIV');
                var cs = this.caret.style;
                cs.position = 'absolute';
                cs.height = '16px'; // default height, actual height set from element properties
                cs.width = '2px';
                cs.backgroundColor = 'blue';
                cs.border = 'none';
                cs.left = cs.top = '0px'; // actual position set relative to parent when displayed
                cs.display = 'block';
                cs.visibility = 'hidden';
                cs.zIndex = '9998'; // immediately below the OSK
                // Start the caret flash timer
                this.caretTimerId = window.setInterval(this.flashCaret, 500);
            };
            DOMTouchHandlers.prototype.getText = function (e) {
                if (e == null) {
                    return '';
                }
                return e.textContent;
            };
            DOMTouchHandlers.prototype.setText = function (e, t, cp) {
                if (e && e.childNodes.length > 0) {
                    var d = e.firstChild, tLen = 0;
                    if (d.childNodes.length >= 3) {
                        var s1 = d.childNodes[0], s2 = d.childNodes[2], t1, t2;
                        // Read current text if null passed (for caret positioning)
                        if (t === null) {
                            t1 = s1.textContent;
                            t2 = s2.textContent;
                            t = t1 + t2;
                        }
                        if (cp < 0) {
                            cp = 0; //if(typeof t._kmwLength == 'undefined') return;
                        }
                        tLen = t._kmwLength();
                        if (cp === null || cp > tLen) {
                            cp = tLen;
                        }
                        t1 = t._kmwSubstr(0, cp);
                        t2 = t._kmwSubstr(cp);
                        s1.textContent = t1;
                        s2.textContent = t2;
                    }
                }
                this.updateBaseElement(e, tLen); // KMW-3, KMW-29
            };
            DOMTouchHandlers.prototype.getTextBeforeCaret = function (e) {
                if (e && e.childNodes.length > 1) {
                    var d = e.firstChild;
                    if (d.childNodes.length > 0) {
                        var s1 = d.childNodes[0];
                        return s1.textContent;
                    }
                }
                return '';
            };
            DOMTouchHandlers.prototype.setTextBeforeCaret = function (e, t) {
                if (e && e.childNodes.length > 0) {
                    var d = e.firstChild, tLen = 0;
                    if (d.childNodes.length > 1) {
                        var s1 = d.childNodes[0], s2 = d.childNodes[2];
                        // Collapse (trailing) whitespace to a single space for INPUT fields (also prevents wrapping)
                        if (e.base.nodeName != 'TEXTAREA') {
                            t = t.replace(/\s+$/, ' ');
                        }
                        s1.textContent = t;
                        // Test total length in order to control base element visibility 
                        tLen = t.length;
                        tLen = tLen + s2.textContent.length;
                    }
                }
                // Update the base element then scroll into view if necessary      
                this.updateBaseElement(e, tLen); //KMW-3, KMW-29      
                this.scrollInput(e);
            };
            DOMTouchHandlers.prototype.getTextCaret = function (e) {
                return this.getTextBeforeCaret(e)._kmwLength();
            };
            DOMTouchHandlers.prototype.setTextCaret = function (e, cp) {
                this.setText(e, null, cp);
                this.showCaret(e);
            };
            DOMTouchHandlers.prototype.hideCaret = function () {
                var e = DOMEventHandlers.states.lastActiveElement, s = null;
                if (e && e.className != null && e.className.indexOf('keymanweb-input') >= 0) {
                    // Always copy text back to underlying field on blur
                    if (e.base instanceof e.base.ownerDocument.defaultView.HTMLTextAreaElement
                        || e.base instanceof e.base.ownerDocument.defaultView.HTMLInputElement) {
                        e.base.value = this.getText(e);
                    }
                    // And set the scroller caret to the end of the element content
                    this.setText(e, null, 100000);
                    // Set the element scroll to zero (or max for RTL INPUT)
                    var ss = e.firstChild.style;
                    if (e.base.nodeName == 'TEXTAREA') {
                        ss.top = '0';
                    }
                    else {
                        if (e.base.dir == 'rtl') {
                            ss.left = (e.offsetWidth - e.firstChild.offsetWidth - 8) + 'px';
                        }
                        else {
                            ss.left = '0';
                        }
                    }
                    // And hide the caret and scrollbar       
                    if (this.caret.parentNode) {
                        this.caret.parentNode.removeChild(this.caret);
                    }
                    this.caret.style.visibility = 'hidden';
                    if (e.childNodes.length > 1) {
                        e.childNodes[1].style.visibility = 'hidden';
                    }
                }
            };
            /**
             * Position the caret at the start of the second span within the scroller
             *
             * @param   {Object}  e   input DIV element (copy of INPUT or TEXTAREA)
             */
            DOMTouchHandlers.prototype.showCaret = function (e) {
                if (!e || !e.firstChild || (e.firstChild.childNodes.length < 3)) {
                    return;
                }
                var scroller = e.firstChild, cs = this.caret.style, sp2 = scroller.childNodes[1];
                // Attach the caret to this scroller and position it over the caret span
                if (this.caret.parentNode != scroller) {
                    scroller.appendChild(this.caret);
                }
                cs.left = sp2.offsetLeft + 'px';
                cs.top = sp2.offsetTop + 'px';
                cs.height = (sp2.offsetHeight - 1) + 'px';
                cs.visibility = 'hidden'; // best to wait for timer to display caret
                // Scroll into view if required
                this.scrollBody(e);
                // Display and position the scrollbar if necessary
                this.setScrollBar(e);
            };
            DOMTouchHandlers.prototype.updateInput = function (x) {
                var util = this.keyman.util;
                var xs = x.style, b = x.base, s = window.getComputedStyle(b, null), mLeft = parseInt(s.marginLeft, 10), mTop = parseInt(s.marginTop, 10), x1 = util._GetAbsoluteX(b), y1 = util._GetAbsoluteY(b);
                var p = x.offsetParent;
                if (p) {
                    x1 = x1 - util._GetAbsoluteX(p);
                    y1 = y1 - util._GetAbsoluteY(p);
                }
                if (isNaN(mLeft)) {
                    mLeft = 0;
                }
                if (isNaN(mTop)) {
                    mTop = 0;
                }
                xs.left = (x1 - mLeft) + 'px';
                xs.top = (y1 - mTop) + 'px';
                // FireFox does not want the offset!
                if (typeof (s.MozBoxSizing) != 'undefined') {
                    xs.left = x1 + 'px';
                    xs.top = y1 + 'px';
                }
                var w = b.offsetWidth, h = b.offsetHeight, pLeft = parseInt(s.paddingLeft, 10), pRight = parseInt(s.paddingRight, 10), pTop = parseInt(s.paddingTop, 10), pBottom = parseInt(s.paddingBottom, 10), bLeft = parseInt(s.borderLeft, 10), bRight = parseInt(s.borderRight, 10), bTop = parseInt(s.borderTop, 10), bBottom = parseInt(s.borderBottom, 10);
                // If using content-box model, must subtract the padding and border, 
                // but *not* for border-box (as for WordPress PlugIn)
                var boxSizing = 'undefined';
                if (typeof (s.boxSizing) != 'undefined') {
                    boxSizing = s.boxSizing;
                }
                else if (typeof (s.MozBoxSizing) != 'undefined') {
                    boxSizing = s.MozBoxSizing;
                }
                if (boxSizing == 'content-box') {
                    if (!isNaN(pLeft))
                        w -= pLeft;
                    if (!isNaN(pRight))
                        w -= pRight;
                    if (!isNaN(bLeft))
                        w -= bLeft;
                    if (!isNaN(bRight))
                        w -= bRight;
                    if (!isNaN(pTop))
                        h -= pTop;
                    if (!isNaN(pBottom))
                        h -= pBottom;
                    if (!isNaN(bTop))
                        h -= bTop;
                    if (!isNaN(bBottom))
                        h -= bBottom;
                }
                if (util.device.OS == 'Android') {
                    // FireFox - adjust padding to match input and text area defaults 
                    if (typeof (s.MozBoxSizing) != 'undefined') {
                        xs.paddingTop = (pTop + 1) + 'px';
                        xs.paddingLeft = pLeft + 'px';
                        if (x.base.nodeName == 'TEXTAREA') {
                            xs.marginTop = '1px';
                        }
                        else {
                            xs.marginLeft = '1px';
                        }
                        w--;
                        h--;
                    }
                    else { // Chrome, Opera, native browser (?)
                        w++;
                        h++;
                    }
                }
                xs.width = w + 'px';
                xs.height = h + 'px';
            };
            /**
             * Set content, visibility, background and borders of input and base elements (KMW-3,KMW-29)
             *
             * @param       {Object}        e     input element
             * @param       {number}        n     length of text in field
             */
            DOMTouchHandlers.prototype.updateBaseElement = function (e, n) {
                var Ldv = e.base.ownerDocument.defaultView;
                if (e.base instanceof Ldv.HTMLInputElement || e.base instanceof Ldv.HTMLTextAreaElement) {
                    e.base.value = this.getText(e); //KMW-29
                }
                else {
                    e.base.textContent = this.getText(e);
                }
                e.style.backgroundColor = (n == 0 ? 'transparent' : window.getComputedStyle(e.base, null).backgroundColor);
                if (this.keyman.util.device.OS == 'iOS') {
                    e.base.style.visibility = (n == 0 ? 'visible' : 'hidden');
                }
            };
            /**
             * Close OSK and remove simulated caret on losing focus
             */
            DOMTouchHandlers.prototype.cancelInput = function () {
                DOMEventHandlers.states.activeElement = null;
                this.hideCaret();
                this.keyman.osk.hideNow();
            };
            ;
            /**
             * Display and position a scrollbar in the input field if needed
             *
             * @param   {Object}  e   input DIV element (copy of INPUT or TEXTAREA)
             */
            DOMTouchHandlers.prototype.setScrollBar = function (e) {
                // Display the scrollbar if necessary.  Added TEXTAREA condition to correct rotation issue KMW-5.  Fixed for 310 beta.
                var scroller = e.childNodes[0], sbs = e.childNodes[1].style;
                if ((scroller.offsetWidth > e.offsetWidth || scroller.offsetLeft < 0) && (e.base.nodeName != 'TEXTAREA')) {
                    sbs.height = '4px';
                    sbs.width = 100 * (e.offsetWidth / scroller.offsetWidth) + '%';
                    sbs.left = 100 * (-scroller.offsetLeft / scroller.offsetWidth) + '%';
                    sbs.top = '0';
                    sbs.visibility = 'visible';
                }
                else if (scroller.offsetHeight > e.offsetHeight || scroller.offsetTop < 0) {
                    sbs.width = '4px';
                    sbs.height = 100 * (e.offsetHeight / scroller.offsetHeight) + '%';
                    sbs.top = 100 * (-scroller.offsetTop / scroller.offsetHeight) + '%';
                    sbs.left = '0';
                    sbs.visibility = 'visible';
                }
                else {
                    sbs.visibility = 'hidden';
                }
            };
            /**
             * Scroll the input field horizontally (INPUT base element) or
             * vertically (TEXTAREA base element) to bring the caret into view
             * as text is entered or deleted form an element
             *
             * @param       {Object}      e        simulated input field object with focus
             */
            DOMTouchHandlers.prototype.scrollInput = function (e) {
                if (!e || !e.firstChild || e.className == null || e.className.indexOf('keymanweb-input') < 0) {
                    return;
                }
                var scroller = e.firstChild;
                if (scroller.childNodes.length < 3) {
                    return;
                }
                var util = this.keyman.util;
                // Get the actual absolute position of the caret and the element 
                var s2 = scroller.childNodes[1], cx = util._GetAbsoluteX(s2), cy = util._GetAbsoluteY(s2), ex = util._GetAbsoluteX(e), ey = util._GetAbsoluteY(e), x = parseInt(scroller.style.left, 10), y = parseInt(scroller.style.top, 10), dx = 0, dy = 0;
                // Scroller offsets must default to zero
                if (isNaN(x))
                    x = 0;
                if (isNaN(y))
                    y = 0;
                // Scroll input field vertically if necessary
                if (e.base instanceof e.base.ownerDocument.defaultView.HTMLTextAreaElement) {
                    var rowHeight = Math.round(e.offsetHeight / e.base.rows);
                    if (cy < ey)
                        dy = cy - ey;
                    if (cy > ey + e.offsetHeight - rowHeight)
                        dy = cy - ey - e.offsetHeight + rowHeight;
                    if (dy != 0)
                        scroller.style.top = (y < dy ? y - dy : 0) + 'px';
                }
                else { // or scroll horizontally if needed
                    if (cx < ex + 8)
                        dx = cx - ex - 12;
                    if (cx > ex + e.offsetWidth - 12)
                        dx = cx - ex - e.offsetWidth + 12;
                    if (dx != 0)
                        scroller.style.left = (x < dx ? x - dx : 0) + 'px';
                }
                // Display the caret (and scroll into view if necessary)
                this.showCaret(e);
            };
            /**
             * Scroll the document body vertically to bring the active input into view
             *
             * @param       {Object}      e        simulated input field object being focussed
             */
            DOMTouchHandlers.prototype.scrollBody = function (e) {
                var osk = this.keyman.osk;
                var util = this.keyman.util;
                if (!e || e.className == null || e.className.indexOf('keymanweb-input') < 0 || !osk.ready) {
                    return;
                }
                // Get the absolute position of the caret
                var s2 = e.firstChild.childNodes[1], y = util._GetAbsoluteY(s2), t = window.pageYOffset, dy = 0;
                if (y < t) {
                    dy = y - t;
                }
                else {
                    dy = y - t - (window.innerHeight - osk._Box.offsetHeight - s2.offsetHeight - 2);
                    if (dy < 0)
                        dy = 0;
                }
                // Hide OSK, then scroll, then re-anchor OSK with absolute position (on end of scroll event)
                if (dy != 0) {
                    window.scrollTo(0, dy + window.pageYOffset);
                }
            };
            return DOMTouchHandlers;
        }(DOMEventHandlers));
        keyman_1.DOMTouchHandlers = DOMTouchHandlers;
    })(keyman = com.keyman || (com.keyman = {}));
})(com || (com = {}));
/***
   KeymanWeb 11.0
   Copyright 2019 SIL International
***/
/**
 * Constructs a string from one or more Unicode character codepoint values
 * passed as integer parameters.
 *
 * @param  {number} cp0,...   1 or more Unicode codepoints, e.g. 0x0065, 0x10000
 * @return {string|null}      The new String object.
 */
String.kmwFromCharCode = function (cp0) {
    var chars = [], i;
    for (i = 0; i < arguments.length; i++) {
        var c = Number(arguments[i]);
        if (!isFinite(c) || c < 0 || c > 0x10FFFF || Math.floor(c) !== c) {
            throw new RangeError("Invalid code point " + c);
        }
        if (c < 0x10000) {
            chars.push(c);
        }
        else {
            c -= 0x10000;
            chars.push((c >> 10) + 0xD800);
            chars.push((c % 0x400) + 0xDC00);
        }
    }
    return String.fromCharCode.apply(undefined, chars);
};
/**
 * Returns a number indicating the Unicode value of the character at the given
 * code point index, with support for supplementary plane characters.
 *
 * @param  {number}  codePointIndex  The code point index into the string (not
                                     the code unit index) to return
 * @return {number}                  The Unicode character value
 */
String.prototype.kmwCharCodeAt = function (codePointIndex) {
    var str = String(this);
    var codeUnitIndex = 0;
    if (codePointIndex < 0 || codePointIndex >= str.length) {
        return NaN;
    }
    for (var i = 0; i < codePointIndex; i++) {
        codeUnitIndex = str.kmwNextChar(codeUnitIndex);
        if (codeUnitIndex === null)
            return NaN;
    }
    var first = str.charCodeAt(codeUnitIndex);
    if (first >= 0xD800 && first <= 0xDBFF && str.length > codeUnitIndex + 1) {
        var second = str.charCodeAt(codeUnitIndex + 1);
        if (second >= 0xDC00 && second <= 0xDFFF) {
            return ((first - 0xD800) << 10) + (second - 0xDC00) + 0x10000;
        }
    }
    return first;
};
/**
 * Returns the code point index within the calling String object of the first occurrence
 * of the specified value, or -1 if not found.
 *
 * @param  {string}  searchValue    The value to search for
 * @param  {number}  [fromIndex]    Optional code point index to start searching from
 * @return {number}                 The code point index of the specified search value
 */
String.prototype.kmwIndexOf = function (searchValue, fromIndex) {
    var str = String(this);
    var codeUnitIndex = str.indexOf(searchValue, fromIndex);
    if (codeUnitIndex < 0) {
        return codeUnitIndex;
    }
    var codePointIndex = 0;
    for (var i = 0; i !== null && i < codeUnitIndex; i = str.kmwNextChar(i))
        codePointIndex++;
    return codePointIndex;
};
/**
 * Returns the code point index within the calling String object of the last occurrence
 * of the specified value, or -1 if not found.
 *
 * @param  {string}  searchValue    The value to search for
 * @param  {number}  fromIndex      Optional code point index to start searching from
 * @return {number}                 The code point index of the specified search value
 */
String.prototype.kmwLastIndexOf = function (searchValue, fromIndex) {
    var str = String(this);
    var codeUnitIndex = str.lastIndexOf(searchValue, fromIndex);
    if (codeUnitIndex < 0) {
        return codeUnitIndex;
    }
    var codePointIndex = 0;
    for (var i = 0; i !== null && i < codeUnitIndex; i = str.kmwNextChar(i))
        codePointIndex++;
    return codePointIndex;
};
/**
 * Returns the length of the string in code points, as opposed to code units.
 *
 * @return {number}                 The length of the string in code points
 */
String.prototype.kmwLength = function () {
    var str = String(this);
    if (str.length == 0)
        return 0;
    for (var i = 0, codeUnitIndex = 0; codeUnitIndex !== null; i++)
        codeUnitIndex = str.kmwNextChar(codeUnitIndex);
    return i;
};
/**
 * Extracts a section of a string and returns a new string.
 *
 * @param  {number}  beginSlice    The start code point index in the string to
 *                                 extract from
 * @param  {number}  endSlice      Optional end code point index in the string
 *                                 to extract to
 * @return {string}                The substring as selected by beginSlice and
 *                                 endSlice
 */
String.prototype.kmwSlice = function (beginSlice, endSlice) {
    var str = String(this);
    var beginSliceCodeUnit = str.kmwCodePointToCodeUnit(beginSlice);
    var endSliceCodeUnit = str.kmwCodePointToCodeUnit(endSlice);
    if (beginSliceCodeUnit === null || endSliceCodeUnit === null)
        return '';
    else
        return str.slice(beginSliceCodeUnit, endSliceCodeUnit);
};
/**
 * Returns the characters in a string beginning at the specified location through
 * the specified number of characters.
 *
 * @param  {number}  start         The start code point index in the string to
 *                                 extract from
 * @param  {number}  length        Optional length to extract
 * @return {string}                The substring as selected by start and length
 */
String.prototype.kmwSubstr = function (start, length) {
    var str = String(this);
    if (start < 0) {
        start = str.kmwLength() + start;
    }
    if (start < 0)
        start = 0;
    var startCodeUnit = str.kmwCodePointToCodeUnit(start);
    var endCodeUnit = startCodeUnit;
    if (startCodeUnit === null)
        return '';
    if (arguments.length < 2) {
        endCodeUnit = str.length;
    }
    else {
        for (var i = 0; i < length; i++)
            endCodeUnit = str.kmwNextChar(endCodeUnit);
    }
    if (endCodeUnit === null)
        return str.substring(startCodeUnit);
    else
        return str.substring(startCodeUnit, endCodeUnit);
};
/**
 * Returns the characters in a string between two indexes into the string.
 *
 * @param  {number}  indexA        The start code point index in the string to
 *                                 extract from
 * @param  {number}  indexB        The end code point index in the string to
 *                                 extract to
 * @return {string}                The substring as selected by indexA and indexB
 */
String.prototype.kmwSubstring = function (indexA, indexB) {
    var str = String(this), indexACodeUnit, indexBCodeUnit;
    if (typeof (indexB) == 'undefined') {
        indexACodeUnit = str.kmwCodePointToCodeUnit(indexA);
        indexBCodeUnit = str.length;
    }
    else {
        if (indexA > indexB) {
            var c = indexA;
            indexA = indexB;
            indexB = c;
        }
        indexACodeUnit = str.kmwCodePointToCodeUnit(indexA);
        indexBCodeUnit = str.kmwCodePointToCodeUnit(indexB);
    }
    if (isNaN(indexACodeUnit) || indexACodeUnit === null)
        indexACodeUnit = 0;
    if (isNaN(indexBCodeUnit) || indexBCodeUnit === null)
        indexBCodeUnit = str.length;
    return str.substring(indexACodeUnit, indexBCodeUnit);
};
/*
  Helper functions
*/
/**
 * Returns the code unit index for the next code point in the string, accounting for
 * supplementary pairs
 *
 * @param  {number|null}  codeUnitIndex  The code unit position to increment
 * @return {number|null}                 The index of the next code point in the string,
 *                                       in code units
 */
String.prototype.kmwNextChar = function (codeUnitIndex) {
    var str = String(this);
    if (codeUnitIndex === null || codeUnitIndex < 0 || codeUnitIndex >= str.length - 1) {
        return null;
    }
    var first = str.charCodeAt(codeUnitIndex);
    if (first >= 0xD800 && first <= 0xDBFF && str.length > codeUnitIndex + 1) {
        var second = str.charCodeAt(codeUnitIndex + 1);
        if (second >= 0xDC00 && second <= 0xDFFF) {
            if (codeUnitIndex == str.length - 2) {
                return null;
            }
            return codeUnitIndex + 2;
        }
    }
    return codeUnitIndex + 1;
};
/**
 * Returns the code unit index for the previous code point in the string, accounting
 * for supplementary pairs
 *
 * @param  {number|null}  codeUnitIndex  The code unit position to decrement
 * @return {number|null}                 The index of the previous code point in the
 *                                       string, in code units
*/
String.prototype.kmwPrevChar = function (codeUnitIndex) {
    var str = String(this);
    if (codeUnitIndex == null || codeUnitIndex <= 0 || codeUnitIndex > str.length) {
        return null;
    }
    var second = str.charCodeAt(codeUnitIndex - 1);
    if (second >= 0xDC00 && second <= 0xDFFF && codeUnitIndex > 1) {
        var first = str.charCodeAt(codeUnitIndex - 2);
        if (first >= 0xD800 && first <= 0xDBFF) {
            return codeUnitIndex - 2;
        }
    }
    return codeUnitIndex - 1;
};
/**
 * Returns the corresponding code unit index to the code point index passed
 *
 * @param  {number|null} codePointIndex  A code point index in the string
 * @return {number|null}                 The corresponding code unit index
 */
String.prototype.kmwCodePointToCodeUnit = function (codePointIndex) {
    if (codePointIndex === null)
        return null;
    var str = String(this);
    var codeUnitIndex = 0;
    if (codePointIndex < 0) {
        codeUnitIndex = str.length;
        for (var i = 0; i > codePointIndex; i--)
            codeUnitIndex = str.kmwPrevChar(codeUnitIndex);
        return codeUnitIndex;
    }
    if (codePointIndex == str.kmwLength())
        return str.length;
    for (var i = 0; i < codePointIndex; i++)
        codeUnitIndex = str.kmwNextChar(codeUnitIndex);
    return codeUnitIndex;
};
/**
 * Returns the corresponding code point index to the code unit index passed
 *
 * @param  {number|null}  codeUnitIndex  A code unit index in the string
 * @return {number|null}                 The corresponding code point index
 */
String.prototype.kmwCodeUnitToCodePoint = function (codeUnitIndex) {
    var str = String(this);
    if (codeUnitIndex === null)
        return null;
    else if (codeUnitIndex == 0)
        return 0;
    else if (codeUnitIndex < 0)
        return str.substr(codeUnitIndex).kmwLength();
    else
        return str.substr(0, codeUnitIndex).kmwLength();
};
/**
 * Returns the character at a the code point index passed
 *
 * @param  {number}  codePointIndex  A code point index in the string
 * @return {string}                  The corresponding character
 */
String.prototype.kmwCharAt = function (codePointIndex) {
    var str = String(this);
    if (codePointIndex >= 0)
        return str.kmwSubstr(codePointIndex, 1);
    else
        return '';
};
/**
 * String prototype library extensions for basic plane characters,
 * to simplify enabling or disabling supplementary plane functionality (I3319)
 */
/**
 * Returns the code unit index for the next code point in the string
 *
 * @param  {number}  codeUnitIndex    A code point index in the string
 * @return {number|null}                   The corresponding character
 */
String.prototype.kmwBMPNextChar = function (codeUnitIndex) {
    var str = String(this);
    if (codeUnitIndex < 0 || codeUnitIndex >= str.length - 1) {
        return null;
    }
    return codeUnitIndex + 1;
};
/**
 * Returns the code unit index for the previous code point in the string
 *
 * @param  {number}  codeUnitIndex    A code unit index in the string
 * @return {number|null}                   The corresponding character
 */
String.prototype.kmwBMPPrevChar = function (codeUnitIndex) {
    var str = String(this);
    if (codeUnitIndex <= 0 || codeUnitIndex > str.length) {
        return null;
    }
    return codeUnitIndex - 1;
};
/**
 * Returns the code unit index for a code point index
 *
 * @param  {number}  codePointIndex   A code point index in the string
 * @return {number}                   The corresponding character
 */
String.prototype.kmwBMPCodePointToCodeUnit = function (codePointIndex) {
    return codePointIndex;
};
/**
 * Returns the code point index for a code unit index
 *
 * @param  {number}  codeUnitIndex    A code point index in the string
 * @return {number}                   The corresponding character
 */
String.prototype.kmwBMPCodeUnitToCodePoint = function (codeUnitIndex) {
    return codeUnitIndex;
};
/**
 * Returns the length of a BMP string
 *
 * @return {number}                   The length in code points
 */
String.prototype.kmwBMPLength = function () {
    var str = String(this);
    return str.length;
};
/**
 * Returns a substring
 *
 * @param  {number}  n
 * @param  {number}  ln
 * @return {string}
 */
String.prototype.kmwBMPSubstr = function (n, ln) {
    var str = String(this);
    if (n > -1)
        return str.substr(n, ln);
    else
        return str.substr(str.length + n, -n);
};
/**
 * Enable or disable supplementary plane string handling
 *
 * @param  {boolean}  bEnable
 */
String.kmwEnableSupplementaryPlane = function (bEnable) {
    var p = String.prototype;
    String._kmwFromCharCode = bEnable ? String.kmwFromCharCode : String.fromCharCode;
    p._kmwCharAt = bEnable ? p.kmwCharAt : p.charAt;
    p._kmwCharCodeAt = bEnable ? p.kmwCharCodeAt : p.charCodeAt;
    p._kmwIndexOf = bEnable ? p.kmwIndexOf : p.indexOf;
    p._kmwLastIndexOf = bEnable ? p.kmwLastIndexOf : p.lastIndexOf;
    p._kmwSlice = bEnable ? p.kmwSlice : p.slice;
    p._kmwSubstring = bEnable ? p.kmwSubstring : p.substring;
    p._kmwSubstr = bEnable ? p.kmwSubstr : p.kmwBMPSubstr;
    p._kmwLength = bEnable ? p.kmwLength : p.kmwBMPLength;
    p._kmwNextChar = bEnable ? p.kmwNextChar : p.kmwBMPNextChar;
    p._kmwPrevChar = bEnable ? p.kmwPrevChar : p.kmwBMPPrevChar;
    p._kmwCodePointToCodeUnit = bEnable ? p.kmwCodePointToCodeUnit : p.kmwBMPCodePointToCodeUnit;
    p._kmwCodeUnitToCodePoint = bEnable ? p.kmwCodeUnitToCodePoint : p.kmwBMPCodeUnitToCodePoint;
};
// Includes KMW-added property declaration extensions for HTML elements.
/// <reference path="kmwexthtml.ts" />
// References the base KMW object.
/// <reference path="kmwbase.ts" />
// References DOM event handling interfaces and classes.
/// <reference path="kmwdomevents.ts" />
// Includes KMW string extension declarations.
/// <reference path="kmwstring.ts" />
var com;
(function (com) {
    var keyman;
    (function (keyman_2) {
        /**
         * This class serves as the intermediary between KeymanWeb and any given web page's elements.
         */
        var DOMManager = /** @class */ (function () {
            function DOMManager(keyman) {
                /**
                 * Tracks a list of event-listening elements.
                 *
                 * In touch mode, this should contain touch-aliasing DIVs, but will contain other elements in non-touch mode.
                 */
                this.inputList = []; // List of simulated input divisions for touch-devices   I3363 (Build 301)
                /**
                 * Tracks a visually-sorted list of elements that are KMW-enabled.
                 */
                this.sortedInputs = []; // List of all INPUT and TEXTAREA elements ordered top to bottom, left to right
                /**
                 * Function     nonKMWTouchHandler
                 * Scope        Private
                 * Description  A handler for KMW-touch-disabled elements when operating on touch devices.
                 */
                this.nonKMWTouchHandler = function (x) {
                    keyman_2.DOMEventHandlers.states.focusing = false;
                    clearTimeout(keyman_2.DOMEventHandlers.states.focusTimer);
                    this.keyman.osk.hideNow();
                }.bind(this);
                this._EnablementMutationObserverCore = function (mutations) {
                    for (var i = 0; i < mutations.length; i++) {
                        var mutation = mutations[i];
                        // ( ? : ) needed as a null check.
                        var disabledBefore = mutation.oldValue ? mutation.oldValue.indexOf('kmw-disabled') >= 0 : false;
                        var disabledAfter = mutation.target.className.indexOf('kmw-disabled') >= 0;
                        if (disabledBefore && !disabledAfter) {
                            this._EnableControl(mutation.target);
                        }
                        else if (!disabledBefore && disabledAfter) {
                            this._DisableControl(mutation.target);
                        }
                        // 'readonly' triggers on whether or not the attribute exists, not its value.
                        if (!disabledAfter && mutation.attributeName == "readonly") {
                            var readonlyBefore = mutation.oldValue ? mutation.oldValue != null : false;
                            var elem = mutation.target;
                            if (elem instanceof elem.ownerDocument.defaultView.HTMLInputElement
                                || elem instanceof elem.ownerDocument.defaultView.HTMLTextAreaElement) {
                                var readonlyAfter = elem.readOnly;
                                if (readonlyBefore && !readonlyAfter) {
                                    this._EnableControl(mutation.target);
                                }
                                else if (!readonlyBefore && readonlyAfter) {
                                    this._DisableControl(mutation.target);
                                }
                            }
                        }
                    }
                }.bind(this);
                this._AutoAttachObserverCore = function (mutations) {
                    var inputElementAdditions = [];
                    var inputElementRemovals = [];
                    for (var i = 0; i < mutations.length; i++) {
                        var mutation = mutations[i];
                        for (var j = 0; j < mutation.addedNodes.length; j++) {
                            inputElementAdditions = inputElementAdditions.concat(this._GetDocumentEditables(mutation.addedNodes[j]));
                        }
                        for (j = 0; j < mutation.removedNodes.length; j++) {
                            inputElementRemovals = inputElementRemovals.concat(this._GetDocumentEditables(mutation.removedNodes[j]));
                        }
                    }
                    for (var k = 0; k < inputElementAdditions.length; k++) {
                        if (this.isKMWInput(inputElementAdditions[k])) { // Apply standard element filtering!
                            this._MutationAdditionObserved(inputElementAdditions[k]);
                        }
                    }
                    for (k = 0; k < inputElementRemovals.length; k++) {
                        if (this.isKMWInput(inputElementRemovals[k])) { // Apply standard element filtering!
                            this._MutationRemovalObserved(inputElementRemovals[k]);
                        }
                    }
                    /* After all mutations have been handled, we need to recompile our .sortedInputs array, but only
                      * if any have actually occurred.
                      */
                    if (inputElementAdditions.length || inputElementRemovals.length) {
                        if (!this.keyman.util.device.touchable) {
                            this.listInputs();
                        }
                        else if (this.keyman.util.device.touchable) { // If something was added or removed, chances are it's gonna mess up our touch-based layout scheme, so let's update the touch elements.
                            var domManager = this;
                            window.setTimeout(function () {
                                domManager.listInputs();
                                for (var k = 0; k < this.sortedInputs.length; k++) {
                                    if (this.sortedInputs[k]['kmw_ip']) {
                                        this.keyman.touchAliasing.updateInput(this.sortedInputs[k]['kmw_ip']);
                                    }
                                }
                            }.bind(this), 1);
                        }
                    }
                }.bind(this);
                /**
                 * Function     _MutationAdditionObserved
                 * Scope        Private
                 * @param       {Element}  Pelem     A page input, textarea, or iframe element.
                 * Description  Used by the MutationObserver event handler to properly setup any elements dynamically added to the document post-initialization.
                 *
                 */
                this._MutationAdditionObserved = function (Pelem) {
                    if (Pelem instanceof Pelem.ownerDocument.defaultView.HTMLIFrameElement && !this.keyman.util.device.touchable) {
                        //Problem:  the iframe is loaded asynchronously, and we must wait for it to load fully before hooking in.
                        var domManager = this;
                        var attachFunctor = function () {
                            domManager.attachToControl(Pelem);
                        };
                        Pelem.addEventListener('load', attachFunctor);
                        /* If the iframe has somehow already loaded, we can't expect the onload event to be raised.  We ought just
                        * go ahead and perform our callback's contents.
                        *
                        * keymanweb.domManager.attachToControl() is now idempotent, so even if our call 'whiffs', it won't cause long-lasting
                        * problems.
                        */
                        if (Pelem.contentDocument.readyState == 'complete') {
                            window.setTimeout(attachFunctor, 1);
                        }
                    }
                    else {
                        this.attachToControl(Pelem);
                    }
                };
                // Used by the mutation event handler to properly decouple any elements dynamically removed from the document.
                this._MutationRemovalObserved = function (Pelem) {
                    var element = Pelem;
                    if (this.keyman.util.device.touchable) {
                        this.disableTouchElement(Pelem);
                    }
                    this.disableInputElement(Pelem); // Remove all KMW event hooks, styling.
                    this.clearElementAttachment(element); // Memory management & auto de-attachment upon removal.
                };
                /**
                 * Function     enableControl
                 * Scope        Public
                 * @param       {Element}      Pelem       Element to be disabled
                 * Description  Disables a KMW control element
                 */
                this.enableControl = function (Pelem) {
                    if (!this.isAttached(Pelem)) {
                        console.warn("KeymanWeb is not attached to element " + Pelem);
                    }
                    var cn = Pelem.className;
                    var tagIndex = cn.indexOf('kmw-disabled');
                    if (tagIndex >= 0) { // if already explicitly disabled...
                        Pelem.className = cn.replace('kmw-disabled', '').trim();
                    }
                    // The rest is triggered within MutationObserver code.
                    // See _EnablementMutationObserverCore.
                };
                /* ------------- Page and document-level management events ------------------ */
                this._WindowLoad = function (e) {
                    //keymanweb.completeInitialization();
                    // Always return to top of page after a page reload
                    document.body.scrollTop = 0;
                    if (typeof document.documentElement != 'undefined') {
                        document.documentElement.scrollTop = 0;
                    }
                }.bind(this);
                /**
                 * Function     _WindowUnload
                 * Scope        Private
                 * Description  Remove handlers before detaching KMW window
                 */
                this._WindowUnload = function () {
                    // Allow the UI to release its own resources
                    this.keyman.uiManager.doUnload();
                    // Allow the OSK to release its own resources
                    if (this.keyman.osk.ready) {
                        this.keyman.osk._Unload(); // I3363 (Build 301)
                    }
                    this.clearLastActiveElement();
                }.bind(this);
                /**
                 * Function     Initialization
                 * Scope        Public
                 * @param       {Object}  arg     object array of user-defined properties
                 * Description  KMW window initialization
                 */
                this.init = function (arg) {
                    var i, j, c, e, p, eTextArea, eInput, opt, dTrailer, ds;
                    var osk = this.keyman.osk;
                    var util = this.keyman.util;
                    var device = util.device;
                    // Local function to convert relative to absolute URLs
                    // with respect to the source path, server root and protocol 
                    var fixPath = function (p) {
                        if (p.length == 0)
                            return p;
                        // Add delimiter if missing
                        if (p.substr(p.length - 1, 1) != '/')
                            p = p + '/';
                        // Absolute
                        if ((p.replace(/^(http)s?:.*/, '$1') == 'http')
                            || (p.replace(/^(file):.*/, '$1') == 'file'))
                            return p;
                        // Absolute (except for protocol)
                        if (p.substr(0, 2) == '//')
                            return this.keyman.protocol + p;
                        // Relative to server root
                        if (p.substr(0, 1) == '/')
                            return this.keyman.rootPath + p.substr(1);
                        // Otherwise, assume relative to source path
                        return this.keyman.srcPath + p;
                    }.bind(this);
                    // Explicit (user-defined) parameter initialization       
                    opt = this.keyman.options;
                    if (typeof (arg) == 'object' && arg !== null) {
                        for (p in opt) {
                            if (arg.hasOwnProperty(p))
                                opt[p] = arg[p];
                        }
                    }
                    // Get default paths and device options
                    if (opt['root'] != '') {
                        this.keyman.rootPath = fixPath(opt['root']);
                    }
                    // Keyboards and fonts are located with respect to the server root by default          
                    //if(opt['keyboards'] == '') opt['keyboards'] = keymanweb.rootPath+'keyboard/';
                    //if(opt['fonts'] == '') opt['fonts'] = keymanweb.rootPath+'font/';
                    // Resources are located with respect to the engine by default 
                    if (opt['resources'] == '') {
                        opt['resources'] = this.keyman.srcPath;
                    }
                    // Convert resource, keyboard and font paths to absolute URLs
                    opt['resources'] = fixPath(opt['resources']);
                    opt['keyboards'] = fixPath(opt['keyboards']);
                    opt['fonts'] = fixPath(opt['fonts']);
                    // Set element attachment type    
                    if (opt['attachType'] == '') {
                        opt['attachType'] = 'auto';
                    }
                    // Set default device options
                    this.keyman.setDefaultDeviceOptions(opt);
                    // Only do remainder of initialization once!  
                    if (this.keyman.initialized) {
                        return Promise.resolve();
                    }
                    var keyman = this.keyman;
                    var domManager = this;
                    // Do not initialize until the document has been fully loaded
                    if (document.readyState !== 'complete') {
                        return new Promise(function (resolve) {
                            window.setTimeout(function () {
                                domManager.init(arg).then(function () {
                                    resolve();
                                });
                            }, 50);
                        });
                    }
                    this.keyman._MasterDocument = window.document;
                    /**
                     * Initialization of touch devices and browser interfaces must be done
                     * after all resources are loaded, during final stage of initialization
                     *
                     */
                    // Treat Android devices as phones if either (reported) screen dimension is less than 4" 
                    if (device.OS == 'Android') {
                        // Determine actual device characteristics  I3363 (Build 301)
                        // TODO: device.dpi may no longer be needed - if so, get rid of it.
                        var dpi = device.getDPI(); //TODO: this will not work when called from HEAD!!
                        device.formFactor = ((screen.height < 4.0 * dpi) || (screen.width < 4.0 * dpi)) ? 'phone' : 'tablet';
                    }
                    // Set exposed initialization flag member for UI (and other) code to use 
                    this.keyman.setInitialized(1);
                    // Finish keymanweb and OSK initialization once all necessary resources are available
                    osk.prepare();
                    // Create and save the remote keyboard loading delay indicator
                    util.prepareWait();
                    // Register deferred keyboard stubs (addKeyboards() format)
                    this.keyman.keyboardManager.registerDeferredStubs();
                    // Initialize the desktop UI
                    this.initializeUI();
                    // Register deferred keyboards 
                    this.keyman.keyboardManager.registerDeferredKeyboards();
                    // Exit initialization here if we're using an embedded code path.
                    if (this.keyman.isEmbedded) {
                        if (!this.keyman.keyboardManager.setDefaultKeyboard()) {
                            console.error("No keyboard stubs exist - cannot initialize keyboard!");
                        }
                        return Promise.resolve();
                    }
                    // Determine the default font for mapped elements
                    this.keyman.appliedFont = this.keyman.baseFont = this.getBaseFont();
                    // Add orientationchange event handler to manage orientation changes on mobile devices
                    // Initialize touch-screen device interface  I3363 (Build 301)
                    if (device.touchable) {
                        this.keyman.handleRotationEvents();
                    }
                    // Initialize browser interface
                    if (this.keyman.options['attachType'] != 'manual') {
                        this._SetupDocument(document.documentElement);
                    }
                    // Create an ordered list of all input and textarea fields
                    this.listInputs();
                    // Initialize the OSK and set default OSK styles
                    // Note that this should *never* be called before the OSK has been initialized.
                    // However, it possibly may be called before the OSK has been fully defined with the current keyboard, need to check.    
                    //osk._Load(); 
                    //document.body.appendChild(osk._Box); 
                    //osk._Load(false);
                    // I3363 (Build 301)
                    if (device.touchable) {
                        // Handle OSK touchend events (prevent propagation)
                        osk._Box.addEventListener('touchend', function (e) {
                            e.stopPropagation();
                        }, false);
                        // Add a blank DIV to the bottom of the page to allow the bottom of the page to be shown
                        dTrailer = document.createElement('DIV');
                        ds = dTrailer.style;
                        ds.width = '100%';
                        ds.height = (screen.width / 2) + 'px';
                        document.body.appendChild(dTrailer);
                        // On Chrome, scrolling up or down causes the URL bar to be shown or hidden 
                        // according to whether or not the document is at the top of the screen.
                        // But when doing that, each OSK row top and height gets modified by Chrome
                        // looking very ugly.  Itwould be best to hide the OSK then show it again 
                        // when the user scroll finishes, but Chrome has no way to reliably report
                        // the touch end event after a move. c.f. http://code.google.com/p/chromium/issues/detail?id=152913
                        // The best compromise behaviour is simply to hide the OSK whenever any 
                        // non-input and non-OSK element is touched.
                        if (device.OS == 'Android' && navigator.userAgent.indexOf('Chrome') > 0) {
                            this.keyman.hideOskWhileScrolling = function (e) {
                                if (typeof (osk._Box) == 'undefined')
                                    return;
                                if (typeof (osk._Box.style) == 'undefined')
                                    return;
                                // The following tests are needed to prevent the OSK from being hidden during normal input!
                                p = e.target.parentNode;
                                if (typeof (p) != 'undefined' && p != null) {
                                    if (p.className.indexOf('keymanweb-input') >= 0)
                                        return;
                                    if (p.className.indexOf('kmw-key-') >= 0)
                                        return;
                                    if (typeof (p.parentNode) != 'undefined') {
                                        p = p.parentNode;
                                        if (p.className.indexOf('keymanweb-input') >= 0)
                                            return;
                                        if (p.className.indexOf('kmw-key-') >= 0)
                                            return;
                                    }
                                }
                                osk.hideNow();
                            };
                            this.keyman.util.attachDOMEvent(document.body, 'touchstart', this.keyman.hideOskWhileScrolling, false);
                        }
                        else {
                            this.keyman.conditionallyHideOsk = function () {
                                // Should not hide OSK if simply closing the language menu (30/4/15)
                                if (keyman.hideOnRelease && !osk.lgList)
                                    osk.hideNow();
                                keyman.hideOnRelease = false;
                            };
                            this.keyman.hideOskIfOnBody = function (e) {
                                keyman.touchY = e.touches[0].screenY;
                                keyman.hideOnRelease = true;
                            };
                            this.keyman.cancelHideIfScrolling = function (e) {
                                var y = e.touches[0].screenY, y0 = keyman.touchY;
                                if (y - y0 > 5 || y0 - y < 5)
                                    keyman.hideOnRelease = false;
                            };
                            this.keyman.util.attachDOMEvent(document.body, 'touchstart', this.keyman.hideOskIfOnBody, false);
                            this.keyman.util.attachDOMEvent(document.body, 'touchmove', this.keyman.cancelHideIfScrolling, false);
                            this.keyman.util.attachDOMEvent(document.body, 'touchend', this.keyman.conditionallyHideOsk, false);
                        }
                    }
                    //document.body.appendChild(keymanweb._StyleBlock);
                    // Restore and reload the currently selected keyboard, selecting a default keyboard if necessary.
                    this.keyman.keyboardManager.restoreCurrentKeyboard();
                    /* Setup of handlers for dynamically-added and (eventually) dynamically-removed elements.
                      * Reference: https://developer.mozilla.org/en/docs/Web/API/MutationObserver
                      *
                      * We place it here so that it loads after most of the other UI loads, reducing the MutationObserver's overhead.
                      * Of course, we only want to dynamically add elements if the user hasn't enabled the manual attachment option.
                      */
                    if (MutationObserver) {
                        var observationTarget = document.querySelector('body'), observationConfig;
                        if (this.keyman.options['attachType'] != 'manual') { //I1961
                            observationConfig = { childList: true, subtree: true };
                            this.attachmentObserver = new MutationObserver(this._AutoAttachObserverCore);
                            this.attachmentObserver.observe(observationTarget, observationConfig);
                        }
                        /**
                         * Setup of handlers for dynamic detection of the kmw-disabled class tag that controls enablement.
                         */
                        observationConfig = { subtree: true, attributes: true, attributeOldValue: true, attributeFilter: ['class', 'readonly'] };
                        this.enablementObserver = new MutationObserver(this._EnablementMutationObserverCore);
                        this.enablementObserver.observe(observationTarget, observationConfig);
                    }
                    else {
                        console.warn("Your browser is outdated and does not support MutationObservers, a web feature " +
                            "needed by KeymanWeb to support dynamically-added elements.");
                    }
                    // Set exposed initialization flag to 2 to indicate deferred initialization also complete
                    this.keyman.setInitialized(2);
                    return Promise.resolve();
                }.bind(this);
                this.keyman = keyman;
                if (keyman.util.device.touchable) {
                    this.touchHandlers = new keyman_2.DOMTouchHandlers(keyman);
                }
                this.nonTouchHandlers = new keyman_2.DOMEventHandlers(keyman);
            }
            DOMManager.prototype.shutdown = function () {
                if (this.enablementObserver) {
                    this.enablementObserver.disconnect();
                }
                if (this.attachmentObserver) {
                    this.attachmentObserver.disconnect();
                }
                for (var _i = 0, _a = this.inputList; _i < _a.length; _i++) {
                    var input = _a[_i];
                    this.disableInputElement(input);
                }
            };
            /**
             * Function     getHandlers
             * Scope        Private
             * @param       {Element}   Pelem  An input, textarea, or touch-alias element from the page.
             * @returns     {Object}
             */
            DOMManager.prototype.getHandlers = function (Pelem) {
                var _attachObj = Pelem.base ? Pelem.base._kmwAttachment : Pelem._kmwAttachment;
                if (_attachObj) {
                    return _attachObj.touchEnabled ? this.touchHandlers : this.nonTouchHandlers;
                }
                else {
                    // Best guess solution.
                    return this.keyman.touchAliasing;
                }
            };
            /**
             * Function     enableTouchElement
             * Scope        Private
             * @param       {Element}  Pelem   An input or textarea element from the page.
             * @return      {boolean}  Returns true if it creates a simulated input element for Pelem; false if not.
             * Description  Creates a simulated input element for the specified INPUT or TEXTAREA, comprising:
             *              an outer DIV, matching the position, size and style of the base element
             *              a scrollable DIV within that outer element
             *              two SPAN elements within the scrollable DIV, to hold the text before and after the caret
             *
             *              The left border of the second SPAN is flashed on and off as a visible caret
             *
             *              Also ensures the element is registered on keymanweb's internal input list.
             */
            DOMManager.prototype.enableTouchElement = function (Pelem) {
                // Touch doesn't worry about iframes.
                if (Pelem.tagName.toLowerCase() == 'iframe') {
                    return false;
                }
                if (this.isKMWDisabled(Pelem)) {
                    this.setupNonKMWTouchElement(Pelem);
                    return false;
                }
                else {
                    // Initialize and protect input elements for touch-screen devices (but never for apps)
                    // NB: now set disabled=true rather than readonly, since readonly does not always 
                    // prevent element from getting focus, e.g. within a LABEL element.
                    // c.f. http://kreotekdev.wordpress.com/2007/11/08/disabled-vs-readonly-form-fields/ 
                    Pelem.kmwInput = true;
                }
                // Remove any handlers for "NonKMWTouch" elements, since we're enabling it here.
                Pelem.removeEventListener('touchstart', this.nonKMWTouchHandler);
                /*
                *  Does this element already have a simulated touch element established?  If so,
                *  just reuse it - if it isn't still in the input list!
                */
                if (Pelem['kmw_ip']) {
                    if (this.inputList.indexOf(Pelem['kmw_ip']) != -1) {
                        return false;
                    }
                    this.inputList.push(Pelem['kmw_ip']);
                    console.log("Unexpected state - this element's simulated input DIV should have been removed from the page!");
                    return true; // May need setup elsewhere since it's just been re-added!
                }
                // The simulated touch element doesn't already exist?  Time to initialize it.
                var x = document.createElement('div');
                x['base'] = x.base = Pelem;
                x._kmwAttachment = Pelem._kmwAttachment; // It's an object reference we need to alias.
                // Set font for base element
                this.enableInputElement(x, true);
                // Add the exposed member 'kmw_ip' to allow page to refer to duplicated element
                Pelem['kmw_ip'] = x;
                Pelem.disabled = true;
                // Superimpose custom input fields for each input or textarea, unless readonly or disabled 
                // Copy essential styles from each base element to the new DIV      
                var d, bs, xs, ds, ss1, ss2, ss3, x1, y1;
                x.className = 'keymanweb-input';
                x.dir = x.base.dir;
                // Add a scrollable interior div 
                d = document.createElement('div');
                bs = window.getComputedStyle(x.base, null);
                xs = x.style;
                xs.overflow = 'hidden';
                xs.position = 'absolute';
                //xs.border='1px solid gray';
                xs.border = 'hidden'; // hide when element empty - KMW-3
                xs.border = 'none';
                xs.borderRadius = '5px';
                // Add a scroll bar (horizontal for INPUT elements, vertical for TEXTAREA elements)
                var sb = document.createElement('div'), sbs = sb.style;
                sbs.position = 'absolute';
                sbs.height = sbs.width = '4px';
                sbs.left = sbs.top = '0';
                sbs.display = 'block';
                sbs.visibility = 'hidden';
                sbs.backgroundColor = '#808080';
                sbs.borderRadius = '2px';
                var s1, s2, s3;
                // And add two spans for the text content before and after the caret, and a caret span
                s1 = document.createElement('span');
                s2 = document.createElement('span');
                s3 = document.createElement('span');
                s1.innerHTML = s2.innerHTML = s3.innerHTML = '';
                s1.className = s2.className = s3.className = 'keymanweb-font';
                d.appendChild(s1);
                d.appendChild(s3);
                d.appendChild(s2);
                x.appendChild(d);
                x.appendChild(sb);
                // Adjust input element properties so that it matches the base element as closely as possible
                ds = d.style;
                ds.position = 'absolute';
                ss1 = s1.style;
                ss2 = s2.style;
                ss3 = s3.style;
                ss1.border = ss2.border = 'none';
                //ss1.backgroundColor='rgb(220,220,255)';ss2.backgroundColor='rgb(220,255,220)'; //only for testing 
                ss1.height = ss2.height = '100%';
                ss1.fontFamily = ss2.fontFamily = ds.fontFamily = bs.fontFamily;
                // Set vertical centering for input elements
                if (x.base.nodeName.toLowerCase() == 'input') {
                    if (!isNaN(parseInt(bs.height, 10))) {
                        ss1.lineHeight = ss2.lineHeight = bs.height;
                    }
                }
                // The invisible caret-positioning span must have a border to ensure that 
                // it remains in the layout, but colour doesn't matter, as it is never visible.
                // Span margins are adjusted to compensate for the border and maintain text positioning.  
                ss3.border = '1px solid red';
                ss3.visibility = 'hidden';
                ss3.marginLeft = ss3.marginRight = '-1px';
                // Set the outer element padding *after* appending the element, 
                // otherwise Firefox misaligns the two elements
                xs.padding = '8px';
                // Set internal padding to match the TEXTAREA and INPUT elements
                ds.padding = '0px 2px'; // OK for iPad, possibly device-dependent
                if (this.keyman.util.device.OS == 'Android' && bs.backgroundColor == 'transparent') {
                    ds.backgroundColor = '#fff';
                }
                else {
                    ds.backgroundColor = bs.backgroundColor;
                }
                // Set the tabindex to 0 to allow a DIV to accept focus and keyboard input 
                // c.f. http://www.w3.org/WAI/GL/WCAG20/WD-WCAG20-TECHS/SCR29.html
                x.tabIndex = 0;
                // Disable (internal) pan and zoom on KMW input elements for IE10
                x.style.msTouchAction = 'none';
                // On touch event, reposition the text caret and prepare for OSK input
                // Removed 'onfocus=' as that resulted in handling the event twice (on iOS, anyway) 
                // We know this to be the correct set of handlers because we're setting up a touch element.
                var touchHandlers = this.touchHandlers;
                x.addEventListener('touchstart', touchHandlers.setFocus);
                x.onmspointerdown = function (e) {
                    e.preventDefault();
                    e.stopPropagation();
                    return touchHandlers.setFocus(e);
                };
                x.addEventListener('touchend', function (e) {
                    e.stopPropagation();
                });
                x.onmspointerup = function (e) {
                    e.stopPropagation();
                };
                // Disable internal scroll when input element in focus 
                x.addEventListener('touchmove', touchHandlers.dragInput, false);
                x.onmspointermove = touchHandlers.dragInput;
                // Hide keyboard and caret when losing focus from simulated input field
                x.onblur = touchHandlers.setBlur;
                // Note that touchend event propagates and is processed by body touchend handler
                // re-setting the first touch point for a drag
                if (x.base.nodeName.toLowerCase() == 'textarea') {
                    s1.style.whiteSpace = s2.style.whiteSpace = 'pre-wrap'; //scroll vertically
                }
                else {
                    s1.style.whiteSpace = s2.style.whiteSpace = 'pre'; //scroll horizontally
                }
                x.base.parentNode.appendChild(x);
                // Refresh style pointers, and match the field sizes
                touchHandlers.updateInput(x);
                xs = x.style;
                xs.color = bs.color; //xs.backgroundColor=bs.backgroundColor; 
                xs.fontFamily = bs.fontFamily;
                xs.fontSize = bs.fontSize;
                xs.fontWeight = bs.fontWeight;
                xs.textDecoration = bs.textDecoration;
                xs.padding = bs.padding;
                xs.margin = bs.margin;
                xs.border = bs.border;
                xs.borderRadius = bs.borderRadius;
                //xs.color='red';  //use only for checking alignment
                // Prevent highlighting of underlying element (Android)
                if ('webkitTapHighlightColor' in xs) {
                    xs.webkitTapHighlightColor = 'rgba(0,0,0,0)';
                }
                if (x.base instanceof x.base.ownerDocument.defaultView.HTMLTextAreaElement) {
                    // Correct rows value if defaulted and box height set by CSS
                    // The rows value is used when setting the caret vertically
                    if (x.base.rows == 2) { // 2 is default value
                        var h = parseInt(bs.height, 10) - parseInt(bs.paddingTop, 10) - parseInt(bs.paddingBottom, 10), dh = parseInt(bs.fontSize, 10), calcRows = Math.round(h / dh);
                        if (calcRows > x.base.rows + 1) {
                            x.base.rows = calcRows;
                        }
                    }
                    ds.width = xs.width;
                    ds.minHeight = xs.height;
                }
                else {
                    ds.minWidth = xs.width;
                    ds.height = xs.height;
                }
                x.base.style.visibility = 'hidden'; // hide by default: KMW-3
                // Add an explicit event listener to allow the duplicated input element 
                // to be adjusted for any changes in base element location or size
                // This will be called for each element after any rotation, as well as after user-initiated changes
                // It has to be wrapped in an anonymous function to preserve scope and be applied to each element.
                (function (xx) {
                    xx._kmwResizeHandler = function (e) {
                        /* A timeout is needed to let the base element complete its resizing before our
                        * simulated element can properly resize itself.
                        *
                        * Not doing this causes errors if the input elements are resized for whatever reason, such as
                        * changing languages to a text with greater height.
                        */
                        window.setTimeout(function () {
                            touchHandlers.updateInput(xx);
                        }, 1);
                    };
                    xx.base.addEventListener('resize', xx._kmwResizeHandler, false);
                    xx.base.addEventListener('orientationchange', xx._kmwResizeHandler, false);
                })(x);
                var textValue;
                if (x.base instanceof x.base.ownerDocument.defaultView.HTMLTextAreaElement
                    || x.base instanceof x.base.ownerDocument.defaultView.HTMLInputElement) {
                    textValue = x.base.value;
                }
                else {
                    textValue = x.base.textContent;
                }
                // And copy the text content
                touchHandlers.setText(x, textValue, null);
                return true;
            };
            /**
             * Function     disableTouchElement
             * Scope        Private
             * @param       {Element}  Pelem   An input or textarea element from the page.
             * Description  Destroys the simulated input element for the specified INPUT or TEXTAREA and reverts
             *              back to desktop-style 'enablement' for the base control.
             */
            DOMManager.prototype.disableTouchElement = function (Pelem) {
                // Do not check for the element being officially disabled - it's also used for detachment.
                // Touch doesn't worry about iframes.
                if (Pelem.tagName.toLowerCase() == 'iframe') {
                    return; // If/when we do support this, we'll need an iframe-level manager for it.
                }
                if (Pelem['kmw_ip']) {
                    var index = this.inputList.indexOf(Pelem['kmw_ip']);
                    if (index != -1) {
                        this.inputList.splice(index, 1);
                    }
                    Pelem.style.visibility = 'visible'; // hide by default: KMW-3
                    Pelem.disabled = false;
                    Pelem.removeEventListener('resize', Pelem['kmw_ip']._kmwResizeHandler);
                    // Disable touch-related handling code.
                    this.disableInputElement(Pelem['kmw_ip']);
                    // We get weird repositioning errors if we don't remove our simulated input element - and permanently.
                    if (Pelem.parentNode) {
                        Pelem.parentNode.removeChild(Pelem['kmw_ip']);
                    }
                    delete Pelem['kmw_ip'];
                }
                this.setupNonKMWTouchElement(Pelem);
            };
            /**
             * Function     setupNonKMWTouchElement
             * Scope        Private
             * @param       {Element}    x  A child element of document.
             * Description  Performs handling for the specified disabled input element on touch-based systems.
             */
            DOMManager.prototype.setupNonKMWTouchElement = function (x) {
                this.keyman.util.attachDOMEvent(x, 'touchstart', this.nonKMWTouchHandler, false);
                // Signify that touch isn't enabled on the control.
                if (this.isAttached(x)) {
                    x._kmwAttachment.touchEnabled = false;
                }
            };
            /**
             * Function     enableInputElement
             * Scope        Private
             * @param       {Element}   Pelem   An element from the document to be enabled with full KMW handling.
             * @param       {boolean=}   isAlias A flag that indicates if the element is a simulated input element for touch.
             * Description  Performs the basic enabling setup for one element and adds it to the inputList if it is an input element.
             *              Note that this method is called for both desktop and touch control routes; the touch route calls it from within
             *              enableTouchElement as it must first establish the simulated touch element to serve as the alias "input element" here.
             *              Note that the 'kmw-disabled' property is managed by the MutationObserver and by the surface API calls.
             */
            DOMManager.prototype.enableInputElement = function (Pelem, isAlias) {
                var baseElement = isAlias ? Pelem['base'] : Pelem;
                if (!this.isKMWDisabled(baseElement)) {
                    if (Pelem instanceof Pelem.ownerDocument.defaultView.HTMLIFrameElement) {
                        this._AttachToIframe(Pelem);
                    }
                    else {
                        baseElement.className = baseElement.className ? baseElement.className + ' keymanweb-font' : 'keymanweb-font';
                        this.inputList.push(Pelem);
                        this.keyman.util.attachDOMEvent(baseElement, 'focus', this.getHandlers(Pelem)._ControlFocus);
                        this.keyman.util.attachDOMEvent(baseElement, 'blur', this.getHandlers(Pelem)._ControlBlur);
                        // These need to be on the actual input element, as otherwise the keyboard will disappear on touch.
                        Pelem.onkeypress = this.getHandlers(Pelem)._KeyPress;
                        Pelem.onkeydown = this.getHandlers(Pelem)._KeyDown;
                        Pelem.onkeyup = this.getHandlers(Pelem)._KeyUp;
                    }
                }
            };
            ;
            /**
             * Function     disableInputElement
             * Scope        Private
             * @param       {Element}   Pelem   An element from the document to be enabled with full KMW handling.
             * @param       {boolean=}   isAlias A flag that indicates if the element is a simulated input element for touch.
             * Description  Inverts the process of enableInputElement, removing all event-handling from the element.
             *              Note that the 'kmw-disabled' property is managed by the MutationObserver and by the surface API calls.
             */
            DOMManager.prototype.disableInputElement = function (Pelem, isAlias) {
                var baseElement = isAlias ? Pelem['base'] : Pelem;
                // Do NOT test for pre-disabledness - we also use this to fully detach without officially 'disabling' via kmw-disabled.
                if (Pelem instanceof Pelem.ownerDocument.defaultView.HTMLIFrameElement) {
                    this._DetachFromIframe(Pelem);
                }
                else {
                    var cnIndex = baseElement.className.indexOf('keymanweb-font');
                    if (cnIndex > 0 && !isAlias) { // See note about the alias below.
                        baseElement.className = baseElement.className.replace('keymanweb-font', '').trim();
                    }
                    // Remove the element from our internal input tracking.
                    var index = this.inputList.indexOf(Pelem);
                    if (index > -1) {
                        this.inputList.splice(index, 1);
                    }
                    if (!isAlias) { // See note about the alias below.
                        this.keyman.util.detachDOMEvent(baseElement, 'focus', this.getHandlers(Pelem)._ControlFocus);
                        this.keyman.util.detachDOMEvent(baseElement, 'blur', this.getHandlers(Pelem)._ControlBlur);
                    }
                    // These need to be on the actual input element, as otherwise the keyboard will disappear on touch.
                    Pelem.onkeypress = null;
                    Pelem.onkeydown = null;
                    Pelem.onkeyup = null;
                }
                // If we're disabling an alias, we should fully enable the base version.  (Thinking ahead to toggleable-touch mode.)
                if (isAlias) {
                    this.inputList.push(baseElement);
                    baseElement.onkeypress = this.getHandlers(Pelem)._KeyPress;
                    baseElement.onkeydown = this.getHandlers(Pelem)._KeyDown;
                    baseElement.onkeyup = this.getHandlers(Pelem)._KeyUp;
                }
                var lastElem = this.getLastActiveElement();
                if (lastElem == Pelem || lastElem == Pelem['kmw_ip']) {
                    this.clearLastActiveElement();
                    this.keyman.keyboardManager.setActiveKeyboard(this.keyman.globalKeyboard, this.keyman.globalLanguageCode);
                    this.keyman.osk._Hide();
                }
                return;
            };
            ;
            /**
         * Function     isKMWDisabled
         * Scope        Private
         * @param       {Element}   x   An element from the page.
         * @return      {boolean}      true if the element's properties indicate a 'disabled' state.
         * Description  Examines attachable elements to determine their default enablement state.
         */
            DOMManager.prototype.isKMWDisabled = function (x) {
                var c = x.className;
                // Exists for some HTMLElements.
                if (x['readOnly']) {
                    return true;
                }
                else if (c && c.indexOf('kmw-disabled') >= 0) {
                    return true;
                }
                return false;
            };
            /**
             * Function     attachToControl
             * Scope        Public
             * @param       {Element}    Pelem       Element to which KMW will be attached
             * Description  Attaches KMW to control (or IFrame)
             */
            DOMManager.prototype.attachToControl = function (Pelem) {
                var touchable = this.keyman.util.device.touchable;
                // Exception for IFrame elements, in case of async loading issues.  (Fixes fun iframe loading bug with Chrome.)
                if (this.isAttached(Pelem) && !(Pelem instanceof Pelem.ownerDocument.defaultView.HTMLIFrameElement)) {
                    return; // We're already attached.
                }
                if (this.isKMWInput(Pelem)) {
                    this.setupElementAttachment(Pelem);
                    if (!this.isKMWDisabled(Pelem)) {
                        if (touchable) {
                            this.enableTouchElement(Pelem);
                        }
                        else {
                            this.enableInputElement(Pelem);
                        }
                    }
                    else {
                        if (touchable) {
                            this.setupNonKMWTouchElement(Pelem);
                        }
                    }
                }
                else if (touchable) {
                    this.setupNonKMWTouchElement(Pelem);
                }
            };
            /**
             * Function     detachFromControl
             * Scope        Public
             * @param       {Element}    Pelem       Element from which KMW will detach
             * Description  Detaches KMW from a control (or IFrame)
             */
            DOMManager.prototype.detachFromControl = function (Pelem) {
                if (!this.isAttached(Pelem)) {
                    return; // We never were attached.
                }
                // #1 - if element is enabled, disable it.  But don't manipulate the 'kmw-disabled' tag.
                if (this.isKMWInput(Pelem)) {
                    // Is it already disabled?
                    if (!this.isKMWDisabled(Pelem)) {
                        this._DisableControl(Pelem);
                    }
                }
                // #2 - clear attachment data.      
                this.clearElementAttachment(Pelem);
            };
            /**
             * Function     isAttached
             * Scope        Private
             * @param       {Element}   x   An element from the page.
             * @return      {boolean}       true if KMW is attached to the element, otherwise false.
             */
            DOMManager.prototype.isAttached = function (x) {
                return x._kmwAttachment ? true : false;
            };
            /**
             * Function     isKMWInput
             * Scope        Private
             * @param       {Element}   x   An element from the page.
             * @return      {boolean}      true if the element is viable for KMW attachment.
             * Description  Examines potential input elements to determine whether or not they are viable for KMW attachment.
             *              Also filters elements not supported for touch devices when device.touchable == true.
             */
            DOMManager.prototype.isKMWInput = function (x) {
                var touchable = this.keyman.util.device.touchable;
                if (x instanceof x.ownerDocument.defaultView.HTMLTextAreaElement) {
                    return true;
                }
                else if (x instanceof x.ownerDocument.defaultView.HTMLInputElement) {
                    if (x.type == 'text' || x.type == 'search') {
                        return true;
                    }
                }
                else if (x instanceof x.ownerDocument.defaultView.HTMLIFrameElement && !touchable) { // Do not allow iframe attachment if in 'touch' mode.
                    try {
                        if (x.contentWindow.document) { // Only allow attachment if the iframe's internal document is valid.
                            return true;
                        }
                    }
                    catch (err) { /* Do not attempt to access iframes outside this site */ }
                }
                else if (x.isContentEditable && !touchable) { // Only allow contentEditable attachment outside of 'touch' mode.
                    return true;
                }
                return false;
            };
            /**
             * Function     setupElementAttachment
             * Scope        Private
             * @param       {Element}   x   An element from the page valid for KMW attachment
             * Description  Establishes the base KeymanWeb data for newly-attached elements.
             *              Does not establish input hooks, which are instead handled during enablement.
             */
            DOMManager.prototype.setupElementAttachment = function (x) {
                // The `_kmwAttachment` property tag maintains all relevant KMW-maintained data regarding the element.
                // It is disgarded upon de-attachment.
                if (x._kmwAttachment) {
                    return;
                }
                else {
                    x._kmwAttachment = new keyman_2.AttachmentInfo(null, this.keyman.util.device.touchable);
                }
            };
            /**
             * Function     clearElementAttachment
             * Scope        Private
             * @param       {Element}   x   An element from the page valid for KMW attachment
             * Description  Establishes the base KeymanWeb data for newly-attached elements.
             *              Does not establish input hooks, which are instead handled during enablement.
             */
            DOMManager.prototype.clearElementAttachment = function (x) {
                // We need to clear the object when de-attaching; helps prevent memory leaks.
                x._kmwAttachment = null;
            };
            /**
             * Function     _AttachToIframe
             * Scope        Private
             * @param       {Element}      Pelem       IFrame to which KMW will be attached
             * Description  Attaches KeymanWeb to IFrame
             */
            DOMManager.prototype._AttachToIframe = function (Pelem) {
                var util = this.keyman.util;
                try {
                    var Lelem = Pelem.contentWindow.document;
                    /* editable Iframe */
                    if (Lelem) {
                        if (Lelem.designMode.toLowerCase() == 'on') {
                            // I2404 - Attach to IFRAMEs child objects, only editable IFRAMEs here
                            util.attachDOMEvent(Lelem, 'focus', this.getHandlers(Pelem)._ControlFocus);
                            util.attachDOMEvent(Lelem, 'blur', this.getHandlers(Pelem)._ControlBlur);
                            util.attachDOMEvent(Lelem, 'keydown', this.getHandlers(Pelem)._KeyDown);
                            util.attachDOMEvent(Lelem, 'keypress', this.getHandlers(Pelem)._KeyPress);
                            util.attachDOMEvent(Lelem, 'keyup', this.getHandlers(Pelem)._KeyUp);
                        }
                        else {
                            // Lelem is the IFrame's internal document; set 'er up!
                            this._SetupDocument(Lelem); // I2404 - Manage IE events in IFRAMEs
                        }
                    }
                }
                catch (err) {
                    // do not attempt to attach to the iframe as it is from another domain - XSS denied!
                }
            };
            /**
         * Function     _DetachFromIframe
         * Scope        Private
         * @param       {Element}      Pelem       IFrame to which KMW will be attached
         * Description  Detaches KeymanWeb from an IFrame
         */
            DOMManager.prototype._DetachFromIframe = function (Pelem) {
                var util = this.keyman.util;
                try {
                    var Lelem = Pelem.contentWindow.document;
                    /* editable Iframe */
                    if (Lelem) {
                        if (Lelem.designMode.toLowerCase() == 'on') {
                            // Mozilla      // I2404 - Attach to  IFRAMEs child objects, only editable IFRAMEs here
                            util.detachDOMEvent(Lelem, 'focus', this.getHandlers(Pelem)._ControlFocus);
                            util.detachDOMEvent(Lelem, 'blur', this.getHandlers(Pelem)._ControlBlur);
                            util.detachDOMEvent(Lelem, 'keydown', this.getHandlers(Pelem)._KeyDown);
                            util.detachDOMEvent(Lelem, 'keypress', this.getHandlers(Pelem)._KeyPress);
                            util.detachDOMEvent(Lelem, 'keyup', this.getHandlers(Pelem)._KeyUp);
                        }
                        else {
                            // Lelem is the IFrame's internal document; set 'er up!
                            this._ClearDocument(Lelem); // I2404 - Manage IE events in IFRAMEs
                        }
                    }
                }
                catch (err) {
                    // do not attempt to attach to the iframe as it is from another domain - XSS denied!
                }
            };
            /**
             * Function     _GetDocumentEditables
             * Scope        Private
             * @param       {Element}     Pelem     HTML element
             * @return      {Array<Element>}        A list of potentially-editable controls.  Further filtering [as with isKMWInput() and
             *                                      isKMWDisabled()] is required.
             */
            DOMManager.prototype._GetDocumentEditables = function (Pelem) {
                var util = this.keyman.util;
                var possibleInputs = [];
                // Document.ownerDocument === null, so we better check that it's not null before proceeding.
                if (Pelem.ownerDocument && Pelem instanceof Pelem.ownerDocument.defaultView.HTMLElement) {
                    var dv = Pelem.ownerDocument.defaultView;
                    if (Pelem instanceof dv.HTMLInputElement || Pelem instanceof dv.HTMLTextAreaElement) {
                        possibleInputs.push(Pelem);
                    }
                    else if (Pelem instanceof dv.HTMLIFrameElement) {
                        possibleInputs.push(Pelem);
                    }
                }
                // Constructing it like this also allows for individual element filtering for the auto-attach MutationObserver without errors.
                if (Pelem.getElementsByTagName) {
                    /**
                     * Function     LiTmp
                     * Scope        Private
                     * @param       {string}    _colon    type of element
                     * @return      {Array<Element>}  array of elements of specified type
                     * Description  Local function to get list of editable controls
                     */
                    var LiTmp = function (_colon) {
                        return util.arrayFromNodeList(Pelem.getElementsByTagName(_colon));
                    };
                    // Note that isKMWInput() will block IFRAME elements as necessary for touch-based devices.
                    possibleInputs = possibleInputs.concat(LiTmp('INPUT'), LiTmp('TEXTAREA'), LiTmp('IFRAME'));
                }
                // Not all active browsers may support the method, but only those that do would work with contenteditables anyway.
                if (Pelem.querySelectorAll) {
                    possibleInputs = possibleInputs.concat(util.arrayFromNodeList(Pelem.querySelectorAll('[contenteditable]')));
                }
                if (Pelem.ownerDocument && Pelem instanceof Pelem.ownerDocument.defaultView.HTMLElement && Pelem.isContentEditable) {
                    possibleInputs.push(Pelem);
                }
                return possibleInputs;
            };
            /**
             * Function     _SetupDocument
             * Scope        Private
             * @param       {Element}     Pelem - the root element of a document, including IFrame documents.
             * Description  Used to automatically attach KMW to editable controls, regardless of control path.
             */
            DOMManager.prototype._SetupDocument = function (Pelem) {
                var possibleInputs = this._GetDocumentEditables(Pelem);
                for (var Li = 0; Li < possibleInputs.length; Li++) {
                    var input = possibleInputs[Li];
                    // It knows how to handle pre-loaded iframes appropriately.
                    this.attachToControl(possibleInputs[Li]);
                }
            };
            /**
             * Function     _ClearDocument
             * Scope        Private
             * @param       {Element}     Pelem - the root element of a document, including IFrame documents.
             * Description  Used to automatically detach KMW from editable controls, regardless of control path.
             *              Mostly used to clear out all controls of a detached IFrame.
             */
            DOMManager.prototype._ClearDocument = function (Pelem) {
                var possibleInputs = this._GetDocumentEditables(Pelem);
                for (var Li = 0; Li < possibleInputs.length; Li++) {
                    var input = possibleInputs[Li];
                    // It knows how to handle pre-loaded iframes appropriately.
                    this.detachFromControl(possibleInputs[Li]);
                }
            };
            /**
             * Set target element text direction (LTR or RTL), but only if the element is empty
             *
             * If the element base directionality is changed after it contains content, unless all the text
             * has the same directionality, text runs will be re-ordered which is confusing and causes
             * incorrect caret positioning
             *
             * @param       {Object}      Ptarg      Target element
             */
            DOMManager.prototype._SetTargDir = function (Ptarg) {
                var elDir = (this.keyman.keyboardManager.isRTL()) ? 'rtl' : 'ltr';
                if (Ptarg) {
                    if (this.keyman.util.device.touchable) {
                        if (Ptarg.textContent.length == 0) {
                            Ptarg.base.dir = Ptarg.dir = elDir;
                            this.getHandlers(Ptarg).setTextCaret(Ptarg, 10000);
                        }
                    }
                    else {
                        if (Ptarg instanceof Ptarg.ownerDocument.defaultView.HTMLInputElement
                            || Ptarg instanceof Ptarg.ownerDocument.defaultView.HTMLTextAreaElement) {
                            if (Ptarg.value.length == 0) {
                                Ptarg.dir = elDir;
                            }
                        }
                        else if (typeof Ptarg.textContent == "string" && Ptarg.textContent.length == 0) { // As with contenteditable DIVs, for example.
                            Ptarg.dir = elDir;
                        }
                    }
                }
            };
            /**
             * Function     _DisableControl
             * Scope        Private
             * @param       {Element}      Pelem       Element to be disabled
             * Description  Disable KMW control element
             */
            DOMManager.prototype._DisableControl = function (Pelem) {
                if (this.isAttached(Pelem)) { // Only operate on attached elements!        
                    if (this.keyman.util.device.touchable) {
                        this.disableTouchElement(Pelem);
                        this.setupNonKMWTouchElement(Pelem);
                        var keyman = this.keyman;
                        // If a touch alias was removed, chances are it's gonna mess up our touch-based layout scheme, so let's update the touch elements.
                        window.setTimeout(function () {
                            this.listInputs();
                            for (var k = 0; k < this.sortedInputs.length; k++) {
                                if (this.sortedInputs[k]['kmw_ip']) {
                                    this.getHandlers(Pelem).updateInput(this.sortedInputs[k]['kmw_ip']);
                                }
                            }
                        }.bind(this), 1);
                    }
                    else {
                        this.listInputs(); // Fix up our internal input ordering scheme.
                    }
                    this.disableInputElement(Pelem);
                }
            };
            /**
             * Function     _EnableControl
             * Scope        Private
             * @param       {Element}    Pelem   Element to be enabled
             * Description  Enable KMW control element
             */
            DOMManager.prototype._EnableControl = function (Pelem) {
                if (this.isAttached(Pelem)) { // Only operate on attached elements!
                    if (this.keyman.util.device.touchable) {
                        this.enableTouchElement(Pelem);
                        var keyman = this.keyman;
                        // If we just added a new input alias, some languages will mess up our touch-based layout scheme
                        // if we don't update the touch elements.
                        window.setTimeout(function () {
                            keyman.domManager.listInputs();
                            for (var k = 0; k < this.sortedInputs.length; k++) {
                                if (this.sortedInputs[k]['kmw_ip']) {
                                    this.getHandlers(Pelem).updateInput(this.sortedInputs[k]['kmw_ip']);
                                }
                            }
                        }.bind(this), 1);
                    }
                    else {
                        this.enableInputElement(Pelem);
                    }
                }
            };
            // Create an ordered list of all text and search input elements and textarea elements
            // except any tagged with class 'kmw-disabled'
            // TODO: email and url types should perhaps use default keyboard only
            DOMManager.prototype.listInputs = function () {
                var i, eList = [], t1 = document.getElementsByTagName('input'), t2 = document.getElementsByTagName('textarea');
                var util = this.keyman.util;
                for (i = 0; i < t1.length; i++) {
                    switch (t1[i].type) {
                        case 'text':
                        case 'search':
                        case 'email':
                        case 'url':
                            if (t1[i].className.indexOf('kmw-disabled') < 0) {
                                eList.push({ ip: t1[i], x: util._GetAbsoluteX(t1[i]), y: util._GetAbsoluteY(t1[i]) });
                            }
                            break;
                    }
                }
                for (i = 0; i < t2.length; i++) {
                    if (t2[i].className.indexOf('kmw-disabled') < 0)
                        eList.push({ ip: t2[i], x: util._GetAbsoluteX(t2[i]), y: util._GetAbsoluteY(t2[i]) });
                }
                /**
                 * Local function to sort by screen position
                 *
                 * @param       {Object}     e1     first object
                 * @param       {Object}     e2     second object
                 * @return      {number}            y-difference between object positions, or x-difference if y values the same
                 */
                var xySort = function (e1, e2) {
                    if (e1.y != e2.y)
                        return e1.y - e2.y;
                    return e1.x - e2.x;
                };
                // Sort elements by Y then X
                eList.sort(xySort);
                // Create a new list of sorted elements
                var tList = [];
                for (i = 0; i < eList.length; i++)
                    tList.push(eList[i].ip);
                // Return the sorted element list
                this.sortedInputs = tList;
            };
            /**
             * Function     disableControl
             * Scope        Public
             * @param       {Element}      Pelem       Element to be disabled
             * Description  Disables a KMW control element
             */
            DOMManager.prototype.disableControl = function (Pelem) {
                if (!this.isAttached(Pelem)) {
                    console.warn("KeymanWeb is not attached to element " + Pelem);
                }
                var cn = Pelem.className;
                if (cn.indexOf('kmw-disabled') < 0) { // if not already explicitly disabled...
                    Pelem.className = cn ? cn + ' kmw-disabled' : 'kmw-disabled';
                }
                // The rest is triggered within MutationObserver code.
                // See _EnablementMutationObserverCore.
            };
            /* ------ Defines independent, per-control keyboard setting behavior for the API. ------ */
            /**
             * Function     setKeyboardForControl
             * Scope        Public
             * @param       {Element}    Pelem    Control element
             * @param       {string|null=}    Pkbd     Keyboard (Clears the set keyboard if set to null.)
             * @param       {string|null=}     Plc      Language Code
             * Description  Set default keyboard for the control
             */
            DOMManager.prototype.setKeyboardForControl = function (Pelem, Pkbd, Plc) {
                /* pass null for kbd to specify no default, or '' to specify the default system keyboard. */
                if (Pkbd !== null && Pkbd !== undefined) {
                    var index = Pkbd.indexOf("Keyboard_");
                    if (index < 0 && Pkbd != '') {
                        Pkbd = "Keyboard_" + Pkbd;
                    }
                }
                else {
                    Plc = null;
                }
                if (Pelem instanceof Pelem.ownerDocument.defaultView.HTMLIFrameElement) {
                    console.warn("'keymanweb.setKeyboardForControl' cannot set keyboard on iframes.");
                    return;
                }
                if (!this.isAttached(Pelem)) {
                    console.error("KeymanWeb is not attached to element " + Pelem);
                    return;
                }
                else {
                    Pelem._kmwAttachment.keyboard = Pkbd;
                    Pelem._kmwAttachment.languageCode = Plc;
                    // If Pelem is the focused element/active control, we should set the keyboard in place now.
                    // 'kmw_ip' is the touch-alias for the original page's control.
                    var lastElem = this.getLastActiveElement();
                    if (lastElem && (lastElem == Pelem || lastElem == Pelem['kmw_ip'])) {
                        if (Pkbd != null && Plc != null) { // Second part necessary for Closure.
                            this.keyman.keyboardManager.setActiveKeyboard(Pkbd, Plc);
                        }
                        else {
                            this.keyman.keyboardManager.setActiveKeyboard(this.keyman.globalKeyboard, this.keyman.globalLanguageCode);
                        }
                    }
                }
            };
            /**
             * Function     getKeyboardForControl
             * Scope        Public
             * @param       {Element}    Pelem    Control element
             * @return      {string|null}         The independently-managed keyboard for the control.
             * Description  Returns the keyboard ID of the current independently-managed keyboard for this control.
             *              If it is currently following the global keyboard setting, returns null instead.
             */
            DOMManager.prototype.getKeyboardForControl = function (Pelem) {
                if (!this.isAttached(Pelem)) {
                    console.error("KeymanWeb is not attached to element " + Pelem);
                    return null;
                }
                else {
                    return Pelem._kmwAttachment.keyboard;
                }
            };
            /**
             * Function     getLanguageForControl
             * Scope        Public
             * @param       {Element}    Pelem    Control element
             * @return      {string|null}         The independently-managed keyboard for the control.
             * Description  Returns the language code used with the current independently-managed keyboard for this control.
             *              If it is currently following the global keyboard setting, returns null instead.
             */
            DOMManager.prototype.getLanguageForControl = function (Pelem) {
                if (!this.isAttached(Pelem)) {
                    console.error("KeymanWeb is not attached to element " + Pelem);
                    return null;
                }
                else {
                    return Pelem._kmwAttachment.languageCode; // Should we have a version for the language code, too?
                }
            };
            /* ------ End independent, per-control keyboard setting behavior definitions. ------ */
            /**
             * Set focus to last active target element (browser-dependent)
             */
            DOMManager.prototype.focusLastActiveElement = function () {
                var lastElem = this.getLastActiveElement();
                if (!lastElem) {
                    return;
                }
                this.keyman.uiManager.justActivated = true;
                if (lastElem.ownerDocument && lastElem instanceof lastElem.ownerDocument.defaultView.HTMLIFrameElement &&
                    this.keyman.domManager._IsMozillaEditableIframe(lastElem, 0)) {
                    lastElem.ownerDocument.defaultView.focus(); // I3363 (Build 301)
                }
                else if (lastElem.focus) {
                    lastElem.focus();
                }
            };
            /**
             * Get the last active target element *before* KMW activated (I1297)
             *
             * @return      {Element}
             */
            DOMManager.prototype.getLastActiveElement = function () {
                return keyman_2.DOMEventHandlers.states.lastActiveElement;
            };
            DOMManager.prototype.clearLastActiveElement = function () {
                keyman_2.DOMEventHandlers.states.lastActiveElement = null;
            };
            DOMManager.prototype.getActiveElement = function () {
                return keyman_2.DOMEventHandlers.states.activeElement;
            };
            DOMManager.prototype._setActiveElement = function (Pelem) {
                keyman_2.DOMEventHandlers.states.activeElement = Pelem;
            };
            /**
             *  Set the active input element directly optionally setting focus
             *
             *  @param  {Object|string} e         element id or element
             *  @param  {boolean=}      setFocus  optionally set focus  (KMEW-123)
             **/
            DOMManager.prototype.setActiveElement = function (e, setFocus) {
                if (typeof (e) == "string") { // Can't instanceof string, and String is a different type.
                    e = document.getElementById(e);
                }
                // Non-attached elements cannot be set as active.
                if (!this.isAttached(e) && !this.keyman.isEmbedded) {
                    console.warn("Cannot set an element KMW is not attached to as the active element.");
                    return;
                }
                // As this is an API function, someone may pass in the base of a touch element.
                // We need to respond appropriately.
                e = e['kmw_ip'] ? e['kmw_ip'] : e;
                // If we're changing controls, don't forget to properly manage the keyboard settings!
                // It's only an issue on 'native' (non-embedded) code paths.
                if (!this.keyman.isEmbedded) {
                    this.keyman.touchAliasing._BlurKeyboardSettings();
                }
                // No need to reset context if we stay within the same element.
                if (keyman_2.DOMEventHandlers.states.activeElement != e) {
                    this.keyman.interface.resetContext();
                }
                keyman_2.DOMEventHandlers.states.activeElement = keyman_2.DOMEventHandlers.states.lastActiveElement = e;
                if (!this.keyman.isEmbedded) {
                    this.keyman.touchAliasing._FocusKeyboardSettings(false);
                }
                // Allow external focusing KMEW-123
                if (arguments.length > 1 && setFocus) {
                    if (this.keyman.util.device.touchable) {
                        this.keyman.touchAliasing.setFocus();
                    }
                    else {
                        this.focusLastActiveElement();
                    }
                }
            };
            /** Sets the active input element only if it is presently null.
             *
             * @param  {Element}
             */
            DOMManager.prototype.initActiveElement = function (Lelem) {
                if (keyman_2.DOMEventHandlers.states.activeElement == null) {
                    keyman_2.DOMEventHandlers.states.activeElement = Lelem;
                }
            };
            /**
             * Move focus to next (or previous) input or text area element on TAB
             *   Uses list of actual input elements
             *
             *   Note that activeElement() on touch devices returns the DIV that overlays
             *   the input element, not the element itself.
             *
             * @param      {number|boolean}  bBack     Direction to move (0 or 1)
             */
            DOMManager.prototype.moveToNext = function (bBack) {
                var i, t = this.sortedInputs, activeBase = this.getActiveElement();
                var touchable = this.keyman.util.device.touchable;
                if (t.length == 0) {
                    return;
                }
                // For touchable devices, get the base element of the DIV
                if (touchable) {
                    activeBase = activeBase.base;
                }
                // Identify the active element in the list of inputs ordered by position
                for (i = 0; i < t.length; i++) {
                    if (t[i] == activeBase)
                        break;
                }
                // Find the next (or previous) element in the list
                i = bBack ? i - 1 : i + 1;
                // Treat the list as circular, wrapping the index if necessary.
                i = i >= t.length ? i - t.length : i;
                i = i < 0 ? i + t.length : i;
                // Move to the selected element
                if (touchable) {
                    // Set focusing flag to prevent OSK disappearing 
                    keyman_2.DOMEventHandlers.states.focusing = true;
                    var target = t[i]['kmw_ip'];
                    // Focus if next element is non-mapped
                    if (typeof (target) == 'undefined') {
                        t[i].focus();
                    }
                    else { // Or reposition the caret on the input DIV if mapped
                        this.keyman.domManager.setActiveElement(target); // Handles both `lastActive` + `active`.
                        this.touchHandlers.setTextCaret(target, 10000); // Safe b/c touchable == true.
                        this.touchHandlers.scrollInput(target); // mousedown check
                        target.focus();
                    }
                }
                else { // Behaviour for desktop browsers
                    t[i].focus();
                }
            };
            /**
             * Move focus to user-specified element
             *
             *  @param  {string|Object}   e   element or element id
             *
             **/
            DOMManager.prototype.moveToElement = function (e) {
                var i;
                if (typeof (e) == "string") { // Can't instanceof string, and String is a different type.
                    e = document.getElementById(e);
                }
                if (this.keyman.util.device.touchable && e['kmw_ip']) {
                    e['kmw_ip'].focus();
                }
                else {
                    e.focus();
                }
            };
            /* ----------------------- Editable IFrame methods ------------------- */
            /**
             * Function     _IsIEEditableIframe
             * Scope        Private
             * @param       {Object}          Pelem         Iframe element
             *              {boolean|number}  PtestOn       1 to test if frame content is editable (TODO: unclear exactly what this is doing!)
             * @return      {boolean}
             * Description  Test if element is an IE editable IFrame
             */
            DOMManager.prototype._IsIEEditableIframe = function (Pelem, PtestOn) {
                var Ldv, Lvalid = Pelem && (Ldv = Pelem.tagName) && Ldv.toLowerCase() == 'body' && (Ldv = Pelem.ownerDocument) && Ldv.parentWindow;
                return (!PtestOn && Lvalid) || (PtestOn && (!Lvalid || Pelem.isContentEditable));
            };
            /**
             * Function     _IsMozillaEditableIframe
             * Scope        Private
             * @param       {Object}           Pelem    Iframe element
             * @param       {boolean|number}   PtestOn  1 to test if 'designMode' is 'ON'
             * @return      {boolean}
             * Description  Test if element is a Mozilla editable IFrame
             */
            DOMManager.prototype._IsMozillaEditableIframe = function (Pelem, PtestOn) {
                var Ldv, Lvalid = Pelem && (Ldv = Pelem.defaultView) && Ldv.frameElement; // Probable bug!
                return (!PtestOn && Lvalid) || (PtestOn && (!Lvalid || Ldv.document.designMode.toLowerCase() == 'on'));
            };
            /* ----------------------- Initialization methods ------------------ */
            /**
             * Get the user-specified (or default) font for the first mapped input or textarea element
             * before applying any keymanweb styles or classes
             *
             *  @return   {string}
             **/
            DOMManager.prototype.getBaseFont = function () {
                var util = this.keyman.util;
                var ipInput = document.getElementsByTagName('input'), ipTextArea = document.getElementsByTagName('textarea'), n = 0, fs, fsDefault = 'Arial,sans-serif';
                // Find the first input element (if it exists)
                if (ipInput.length == 0 && ipTextArea.length == 0) {
                    n = 0;
                }
                else if (ipInput.length > 0 && ipTextArea.length == 0) {
                    n = 1;
                }
                else if (ipInput.length == 0 && ipTextArea.length > 0) {
                    n = 2;
                }
                else {
                    var firstInput = ipInput[0];
                    var firstTextArea = ipTextArea[0];
                    if (firstInput.offsetTop < firstTextArea.offsetTop) {
                        n = 1;
                    }
                    else if (firstInput.offsetTop > firstTextArea.offsetTop) {
                        n = 2;
                    }
                    else if (firstInput.offsetLeft < firstTextArea.offsetLeft) {
                        n = 1;
                    }
                    else if (firstInput.offsetLeft > firstTextArea.offsetLeft) {
                        n = 2;
                    }
                }
                // Grab that font!
                switch (n) {
                    case 0:
                        fs = fsDefault;
                    case 1:
                        fs = util.getStyleValue(ipInput[0], 'font-family');
                    case 2:
                        fs = util.getStyleValue(ipTextArea[0], 'font-family');
                }
                if (typeof (fs) == 'undefined' || fs == 'monospace') {
                    fs = fsDefault;
                }
                return fs;
            };
            /**
             * Initialize the desktop user interface as soon as it is ready
            **/
            DOMManager.prototype.initializeUI = function () {
                if (this.keyman.ui && this.keyman.ui['initialize'] instanceof Function) {
                    this.keyman.ui['initialize']();
                    // Display the OSK (again) if enabled, in order to set its position correctly after
                    // adding the UI to the page 
                    this.keyman.osk._Show();
                }
                else {
                    window.setTimeout(this.initializeUI.bind(this), 1000);
                }
            };
            return DOMManager;
        }());
        keyman_2.DOMManager = DOMManager;
    })(keyman = com.keyman || (com.keyman = {}));
})(com || (com = {}));
// The Device object definition -------------------------------------------------
var com;
(function (com) {
    var keyman;
    (function (keyman) {
        var Device = /** @class */ (function () {
            // Generates a default Device value.
            function Device() {
                this.touchable = !!('ontouchstart' in window);
                this.OS = '';
                this.formFactor = 'desktop';
                this.dyPortrait = 0;
                this.dyLandscape = 0;
                this.version = '0';
                this.orientation = window.orientation;
                this.browser = '';
            }
            /**
             * Get device horizontal DPI for touch devices, to set actual size of active regions
             * Note that the actual physical DPI may be somewhat different.
             *
             * @return      {number}
             */
            Device.prototype.getDPI = function () {
                var t = document.createElement('DIV'), s = t.style, dpi = 96;
                if (document.readyState !== 'complete') {
                    return dpi;
                }
                t.id = 'calculateDPI';
                s.position = 'absolute';
                s.display = 'block';
                s.visibility = 'hidden';
                s.left = '10px';
                s.top = '10px';
                s.width = '1in';
                s.height = '10px';
                document.body.appendChild(t);
                dpi = (typeof window.devicePixelRatio == 'undefined') ? t.offsetWidth : t.offsetWidth * window.devicePixelRatio;
                document.body.removeChild(t);
                return dpi;
            };
            Device.prototype.detect = function () {
                var IEVersion = Device._GetIEVersion();
                if (navigator && navigator.userAgent) {
                    var agent = navigator.userAgent;
                    if (agent.indexOf('iPad') >= 0) {
                        this.OS = 'iOS';
                        this.formFactor = 'tablet';
                        this.dyPortrait = this.dyLandscape = 0;
                    }
                    else if (agent.indexOf('iPhone') >= 0) {
                        this.OS = 'iOS';
                        this.formFactor = 'phone';
                        this.dyPortrait = this.dyLandscape = 25;
                    }
                    else if (agent.indexOf('Android') >= 0) {
                        this.OS = 'Android';
                        this.formFactor = 'phone'; // form factor may be redefined on initialization
                        this.dyPortrait = 75;
                        this.dyLandscape = 25;
                        try {
                            var rx = new RegExp("(?:Android\\s+)(\\d+\\.\\d+\\.\\d+)");
                            this.version = agent.match(rx)[1];
                        }
                        catch (ex) { }
                    }
                    else if (agent.indexOf('Linux') >= 0) {
                        this.OS = 'Linux';
                    }
                    else if (agent.indexOf('Macintosh') >= 0) {
                        this.OS = 'MacOSX';
                    }
                    else if (agent.indexOf('Windows NT') >= 0) {
                        this.OS = 'Windows';
                        if (agent.indexOf('Touch') >= 0) {
                            this.formFactor = 'phone'; // will be redefined as tablet if resolution high enough
                        }
                        // Windows Phone and Tablet PC
                        if (typeof navigator.msMaxTouchPoints == 'number' && navigator.msMaxTouchPoints > 0) {
                            this.touchable = true;
                        }
                    }
                }
                // var sxx=device.formFactor;
                // Check and possibly revise form factor according to actual screen size (adjusted for Galaxy S, maybe OK generally?)
                if (this.formFactor == 'tablet' && Math.min(screen.width, screen.height) < 400) {
                    this.formFactor = 'phone';
                }
                // Trust what iOS tells us for phone vs tablet.
                if (this.formFactor == 'phone' && Math.max(screen.width, screen.height) > 720 && this.OS != 'iOS') {
                    this.formFactor = 'tablet';
                }
                //                           alert(sxx+'->'+device.formFactor);
                // Check for phony iOS devices (Win32 test excludes Chrome touch emulation on Windows)!
                if (this.OS == 'iOS' && !('ongesturestart' in window) && navigator.platform != 'Win32') {
                    this.OS = 'Android';
                }
                // Determine application or browser
                this.browser = 'web';
                if (IEVersion < 999) {
                    this.browser = 'ie';
                }
                else {
                    if (this.OS == 'iOS' || this.OS.toLowerCase() == 'macosx') {
                        this.browser = 'safari';
                    }
                    var bMatch = /Firefox|Chrome|OPR|Safari|Edge/;
                    if (bMatch.test(navigator.userAgent)) {
                        if ((navigator.userAgent.indexOf('Firefox') >= 0) && ('onmozorientationchange' in screen)) {
                            this.browser = 'firefox';
                        }
                        else if (navigator.userAgent.indexOf('OPR') >= 0) {
                            this.browser = 'opera';
                        }
                        else if (navigator.userAgent.indexOf(' Edge/') >= 0) {
                            // Edge is too common a word, so test for Edge/ :)
                            // Must come before Chrome and Safari test because
                            // Edge pretends to be both
                            this.browser = 'edge';
                        }
                        else if (navigator.userAgent.indexOf('Chrome') >= 0) {
                            // This test must come before Safari test because on macOS,
                            // Chrome also reports "Safari"
                            this.browser = 'chrome';
                        }
                        else if (navigator.userAgent.indexOf('Safari') >= 0) {
                            this.browser = 'safari';
                        }
                    }
                }
            };
            Device._GetIEVersion = function () {
                var n, agent = '';
                if ('userAgent' in navigator) {
                    agent = navigator.userAgent;
                }
                // Test first for old versions
                if ('selection' in document) { // only defined for IE and not for IE 11!!!       
                    var appVer = navigator.appVersion;
                    n = appVer.indexOf('MSIE ');
                    if (n >= 0) {
                        // Check for quirks mode page, always return 6 if so
                        if (document.compatMode == 'BackCompat') {
                            return 6;
                        }
                        appVer = appVer.substr(n + 5);
                        n = appVer.indexOf('.');
                        if (n > 0) {
                            return parseInt(appVer.substr(0, n), 10);
                        }
                    }
                }
                // Finally test for IE 11 (and later?)
                n = agent.indexOf('Trident/');
                if (n < 0) {
                    return 999;
                }
                agent = agent.substr(n + 8);
                n = agent.indexOf('.');
                if (n > 0) {
                    return parseInt(agent.substr(0, n), 10) + 4;
                }
                return 999;
            };
            return Device;
        }());
        keyman.Device = Device;
    })(keyman = com.keyman || (com.keyman = {}));
})(com || (com = {}));
// Includes KMW-added property declaration extensions for HTML elements.
/// <reference path="kmwexthtml.ts" />
// Includes the Device definition set.
/// <reference path="kmwdevice.ts" />
var com;
(function (com) {
    var keyman;
    (function (keyman_3) {
        var DOMEventTracking = /** @class */ (function () {
            function DOMEventTracking(Pelem, Peventname, Phandler, PuseCapture) {
                this.Pelem = Pelem;
                this.Peventname = Peventname.toLowerCase();
                this.Phandler = Phandler;
                this.PuseCapture = PuseCapture;
            }
            DOMEventTracking.prototype.equals = function (other) {
                return this.Pelem == other.Pelem && this.Peventname == other.Peventname &&
                    this.Phandler == other.Phandler && this.PuseCapture == other.PuseCapture;
            };
            return DOMEventTracking;
        }());
        ;
        var Util = /** @class */ (function () {
            function Util(keyman) {
                this.linkedStylesheets = [];
                // An object mapping event names to individual event lists.  Maps strings to arrays.
                this.events = {};
                this.currentEvents = []; // The event messaging call stack.
                this.domEvents = [];
                this.embeddedFonts = []; // Array of currently embedded font descriptor entries.  (Is it just a string?)
                this.getAbsoluteX = this._GetAbsoluteX;
                this.getAbsoluteY = this._GetAbsoluteY;
                this.getAbsolute = this._GetAbsolute;
                /**
                 * Select start handler (to replace multiple inline handlers) (Build 360)
                 */
                this.selectStartHandler = function () {
                    return false;
                };
                this.createElement = this._CreateElement;
                this.initDevices();
                this.keyman = keyman;
            }
            // Possible alternative:  https://www.npmjs.com/package/language-tags
            // This would necessitate linking in a npm module into compiled KeymanWeb, though.
            Util.prototype['getLanguageCodes'] = function (lgCode) {
                if (lgCode.indexOf('-') == -1) {
                    return [lgCode];
                }
                else {
                    return lgCode.split('-');
                }
            };
            Util.prototype.initDevices = function () {
                this.device = new keyman_3.Device();
                this.physicalDevice = new keyman_3.Device();
                this.activeDevice = this.device;
                // Initialize the true device values.
                this.device.detect();
                /* DEBUG: Force touch device   (Build 360)
                
                device.touchable = true;
                device.browser = 'safari';
                device.formFactor = 'tablet';
                device.OS = 'iOS';
                
                END DEBUG */
                /* If we've made it to this point of initialization and aren't anything else, KeymanWeb assumes
                * we're a desktop.  Since we don't yet support desktops with touch-based input, we disable it here.
                */
                if (this.device.formFactor == 'desktop') {
                    this.device.touchable = false;
                }
                /**
                 * Represents hardware-based keystrokes regardless of the 'true' device, facilitating hardware keyboard input
                 * whenever touch-based input is available.
                 */
                this.physicalDevice = new keyman_3.Device();
                this.physicalDevice.touchable = false;
                this.physicalDevice.browser = this.device.browser;
                this.physicalDevice.formFactor = 'desktop';
                this.physicalDevice.OS = this.device.OS;
            };
            /**
             * Function     arrayFromNodeList
             * Scope        Public
             * @param       {Object}    nl a node list, as returned from getElementsBy_____ methods.
             * Description  Transforms a node list into an array.   *
             * @return      {Array<Element>}
             */
            Util.prototype.arrayFromNodeList = function (nl) {
                var res = [];
                for (var i = 0; i < nl.length; i++) {
                    res.push(nl[i]);
                }
                return res;
            };
            /**
             * Function    addEventListener
             * Scope       Private
             * @param      {string}     event     name of event prefixed by module, e.g. osk.touchmove
             * @param      {function(Object)}   func      event handler
             * @return     {boolean}
             * Description Add (or replace) an event listener for this component
             */
            Util.prototype.addEventListener = function (event, func) {
                this.removeEventListener(event, func);
                this.events[event].push(func);
                return true;
            };
            /**
             * Function    removeEventListener
             * Scope       Private
             * @param      {string}     event     name of event prefixed by module, e.g. osk.touchmove
             * @param      {function(Object)}   func      event handler
             * @return     {boolean}
             * Description Remove the specified function from the listeners for this event
             */
            Util.prototype.removeEventListener = function (event, func) {
                if (typeof this.events[event] == 'undefined') {
                    this.events[event] = [];
                }
                for (var i = 0; i < this.events[event].length; i++) {
                    if (this.events[event][i] == func) {
                        this.events[event].splice(i, 1);
                        return true;
                    }
                }
                return false;
            };
            /**
             * Function    callEvent
             * Scope       Private
             * @param      {string}     event     name of event prefixed by module, e.g. osk.touchmove
             * @param      {Array}      params    parameter array for function
             * @return     {boolean}
             * Description Invoke an event using any function with up to four arguments
             */
            Util.prototype.callEvent = function (event, params) {
                if (typeof this.events[event] == 'undefined') {
                    return true;
                }
                if (this.currentEvents.indexOf(event) != -1) {
                    return false; // Avoid event messaging recursion!
                }
                this.currentEvents.push(event);
                for (var i = 0; i < this.events[event].length; i++) {
                    var func = this.events[event][i], result = false;
                    try {
                        result = func(params);
                    }
                    catch (strExcept) {
                        result = false;
                    } //don't know whether to use true or false here      
                    if (result === false) {
                        this.currentEvents.pop();
                        return false;
                    }
                }
                this.currentEvents.pop();
                return true;
            };
            /**
             * Function     attachDOMEvent: Note for most browsers, adds an event to a chain, doesn't stop existing events
             * Scope        Public
             * @param       {Object}    Pelem       Element (or IFrame-internal Document) to which event is being attached
             * @param       {string}    Peventname  Name of event without 'on' prefix
             * @param       {function(Object)}  Phandler    Event handler for event
             * @param       {boolean=}  PuseCapture True only if event to be handled on way to target element
             * Description  Attaches event handler to element DOM event
             */
            Util.prototype.attachDOMEvent = function (Pelem, Peventname, Phandler, PuseCapture) {
                this.detachDOMEvent(Pelem, Peventname, Phandler, PuseCapture);
                Pelem.addEventListener(Peventname, Phandler, PuseCapture ? true : false);
                // Since we're attaching to the DOM, these events should be tracked for detachment during shutdown.
                var event = new DOMEventTracking(Pelem, Peventname, Phandler, PuseCapture);
                this.domEvents.push(event);
            };
            /**
             * Function     detachDOMEvent
             * Scope        Public
             * @param       {Object}    Pelem       Element from which event is being detached
             * @param       {string}    Peventname  Name of event without 'on' prefix
             * @param       {function(Object)}  Phandler    Event handler for event
             * @param       {boolean=}  PuseCapture True if event was being handled on way to target element
             * Description Detaches event handler from element [to prevent memory leaks]
             */
            Util.prototype.detachDOMEvent = function (Pelem, Peventname, Phandler, PuseCapture) {
                Pelem.removeEventListener(Peventname, Phandler, PuseCapture);
                // Since we're detaching, we should drop the tracking data from the old event.
                var event = new DOMEventTracking(Pelem, Peventname, Phandler, PuseCapture);
                for (var i = 0; i < this.domEvents.length; i++) {
                    if (this.domEvents[i].equals(event)) {
                        this.domEvents.splice(i, 1);
                        break;
                    }
                }
            };
            /**
             * Function     getOption
             * Scope        Public
             * @param       {string}    optionName  Name of option
             * @param       {*=}        dflt        Default value of option
             * @return      {*}
             * Description  Returns value of named option
             */
            Util.prototype.getOption = function (optionName, dflt) {
                if (optionName in this.keyman.options) {
                    return this.keyman.options[optionName];
                }
                else if (arguments.length > 1) {
                    return dflt;
                }
                else {
                    return '';
                }
            };
            /**
             * Function     setOption
             * Scope        Public
             * @param       {string}    optionName  Name of option
             * @param       {*=}        value       Value of option
             * Description  Sets value of named option
             */
            Util.prototype.setOption = function (optionName, value) {
                this.keyman.options[optionName] = value;
            };
            /**
             * Function     getAbsoluteX
             * Scope        Public
             * @param       {Object}    Pobj        HTML element
             * @return      {number}
             * Description  Returns x-coordinate of Pobj element absolute position with respect to page
             */
            Util.prototype._GetAbsoluteX = function (Pobj) {
                var Lobj;
                if (!Pobj) {
                    return 0;
                }
                var Lcurleft = Pobj.offsetLeft ? Pobj.offsetLeft : 0;
                Lobj = Pobj; // I2404 - Support for IFRAMEs
                if (Lobj.offsetParent) {
                    while (Lobj.offsetParent) {
                        Lobj = Lobj.offsetParent;
                        Lcurleft += Lobj.offsetLeft;
                    }
                }
                // Correct position if element is within a frame (but not if the controller is in document within that frame)
                if (Lobj && Lobj.ownerDocument && (Pobj.ownerDocument != this.keyman._MasterDocument)) {
                    var Ldoc = Lobj.ownerDocument; // I2404 - Support for IFRAMEs
                    if (Ldoc && Ldoc.defaultView && Ldoc.defaultView.frameElement) {
                        return Lcurleft + this._GetAbsoluteX(Ldoc.defaultView.frameElement) - Ldoc.documentElement.scrollLeft;
                    }
                }
                return Lcurleft;
            };
            /**
             * Function     getAbsoluteY
             * Scope        Public
             * @param       {Object}    Pobj        HTML element
             * @return      {number}
             * Description  Returns y-coordinate of Pobj element absolute position with respect to page
             */
            Util.prototype._GetAbsoluteY = function (Pobj) {
                var Lobj;
                if (!Pobj) {
                    return 0;
                }
                var Lcurtop = Pobj.offsetTop ? Pobj.offsetTop : 0;
                Lobj = Pobj; // I2404 - Support for IFRAMEs
                if (Lobj.ownerDocument && Lobj instanceof Lobj.ownerDocument.defaultView.HTMLElement) {
                    while (Lobj.offsetParent) {
                        Lobj = Lobj.offsetParent;
                        Lcurtop += Lobj.offsetTop;
                    }
                }
                // Correct position if element is within a frame (but not if the controller is in document within that frame)
                if (Lobj && Lobj.ownerDocument && (Pobj.ownerDocument != this.keyman._MasterDocument)) {
                    var Ldoc = Lobj.ownerDocument; // I2404 - Support for IFRAMEs
                    if (Ldoc && Ldoc.defaultView && Ldoc.defaultView.frameElement) {
                        return Lcurtop + this._GetAbsoluteY(Ldoc.defaultView.frameElement) - Ldoc.documentElement.scrollTop;
                    }
                }
                return Lcurtop;
            };
            /**
             * Function     getAbsolute
             * Scope        Public
             * @param       {Object}    Pobj        HTML element
             * @return      {Object.<string,number>}
             * Description  Returns absolute position of Pobj element with respect to page
             */
            Util.prototype._GetAbsolute = function (Pobj) {
                var p = {
                    /* @ export */
                    x: this._GetAbsoluteX(Pobj),
                    /* @ export */
                    y: this._GetAbsoluteY(Pobj)
                };
                return p;
            };
            /**
             * Default mouse down event handler (to replace multiple inline handlers) (Build 360)
             */
            Util.prototype.mouseDownPreventDefaultHandler = function (e) {
                if (e) {
                    e.preventDefault();
                }
            };
            // Found a bit of magic formatting that allows dynamic return typing for a specified element tag!
            Util.prototype._CreateElement = function (nodeName) {
                var e = document.createElement(nodeName);
                // Make element unselectable (Internet Explorer)
                if (typeof e.onselectstart != 'undefined') { //IE route
                    e.onselectstart = this.selectStartHandler; // Build 360
                }
                else { // And for well-behaved browsers (may also work for IE9+, but not necessary)
                    e.style.MozUserSelect = "none";
                    e.style.KhtmlUserSelect = "none";
                    e.style.UserSelect = "none";
                    e.style.WebkitUserSelect = "none";
                }
                return e;
            };
            /**
             * Function     getIEVersion
             * Scope        Public
             * @return      {number}
             * Description  Return IE version number (or 999 if browser not IE)
             */
            Util.prototype.getIEVersion = function () {
                return keyman_3.Device._GetIEVersion();
            };
            Util.prototype.getFontSizeStyle = function (e) {
                var val;
                var fs;
                if (typeof e == 'string') {
                    fs = e;
                }
                else {
                    fs = e.style.fontSize;
                }
                if (fs.indexOf('em') != -1) {
                    val = parseFloat(fs.substr(0, fs.indexOf('em')));
                    return { val: val, absolute: false };
                }
                else if (fs.indexOf('px') != -1) {
                    val = parseFloat(fs.substr(0, fs.indexOf('px')));
                    return { val: val, absolute: true };
                }
                else if (fs.indexOf('%') != -1) {
                    val = parseFloat(fs.substr(0, fs.indexOf('%')));
                    return { val: val / 100, absolute: false };
                }
                else {
                    // Cannot parse.
                    return null;
                }
            };
            /**
             * Get browser-independent computed style value for element
             *
             * @param       {Element}     e             HTML element
             * @param       {string}      s             CSS style name
             * @return      {*}
             */
            Util.prototype.getStyleValue = function (e, s) {
                // Build 349: error trap added, since on iOS, getPropertyValue may fail 
                // and crash in some cases, possibly if passed a text node 
                try {
                    if (e && (typeof (window.getComputedStyle) != 'undefined')) {
                        return window.getComputedStyle(e, '').getPropertyValue(s);
                    }
                }
                catch (ex) { }
                // Return empty string if unable to get style value
                return '';
            };
            /**
             * Get browser-independent computed style integer value for element  (Build 349)
             *
             * @param       {Element}     e             HTML element
             * @param       {string}      s             CSS style name
             * @param       {number=}     d             default value if NaN
             * @return      {number}                    integer value of style
             */
            Util.prototype.getStyleInt = function (e, s, d) {
                var x = parseInt(this.getStyleValue(e, s), 10);
                if (!isNaN(x)) {
                    return x;
                }
                // Return the default value if numeric, else 0 
                if (typeof (d) == 'number') {
                    return d;
                }
                else {
                    return 0;
                }
            };
            /**
             * Expose the touchable state for UIs - will disable external UIs entirely
             **/
            Util.prototype.isTouchDevice = function () {
                return this.device.touchable;
            };
            /**
             * Get orientation of tablet or phone  display
             *
             * @return      {boolean}
             */
            Util.prototype.portraitView = function () {
                return !this.landscapeView();
            };
            /**
             * Get orientation of tablet or phone  display
             *
             * @return      {boolean}
             */
            Util.prototype.landscapeView = function () {
                var orientation;
                // Assume portrait mode if orientation undefined
                if (typeof window.orientation != 'undefined') { // Used by iOS Safari
                    // Else landscape for +/-90, portrait for 0, +/-180   
                    orientation = window.orientation;
                }
                else if (typeof window.screen.orientation != 'undefined') { // Used by Firefox, Chrome
                    orientation = window.screen.orientation.angle;
                }
                if (orientation !== undefined) {
                    return (Math.abs(orientation / 90) == 1);
                }
                else {
                    return false;
                }
            };
            /**
             * Get viewport scale factor for this document
             *
             * @return      {number}
             */
            Util.prototype.getViewportScale = function () {
                // This can sometimes fail with some browsers if called before document defined,
                // so catch the exception
                try {
                    // Get viewport width
                    var viewportWidth = document.documentElement.clientWidth;
                    // Return a default value if screen width is greater than the viewport width (not fullscreen). 
                    if (screen.width > viewportWidth) {
                        return 1;
                    }
                    // Get the orientation corrected screen width 
                    var screenWidth = screen.width;
                    if (this.landscapeView()) {
                        // Take larger of the two dimensions
                        if (screen.width < screen.height) {
                            screenWidth = screen.height;
                        }
                    }
                    else {
                        // Take smaller of the two dimensions
                        if (screen.width > screen.height) {
                            screenWidth = screen.height;
                        }
                    }
                    // Calculate viewport scale
                    return Math.round(100 * screenWidth / window.innerWidth) / 100;
                }
                catch (ex) {
                    return 1;
                }
            };
            /**
             * Return height of URL bar on mobile devices, if visible
             * TODO: This does not seem to be right, so is not currently used
             *
             * @return      {number}
             */
            Util.prototype.barHeight = function () {
                var dy = 0;
                if (this.device.formFactor == 'phone') {
                    dy = screen.height / 2 - window.innerHeight - (this.landscapeView() ? this.device.dyLandscape : this.device.dyPortrait);
                }
                return dy;
            };
            /**
             * Function     _EncodeEntities
             * Scope        Private
             * @param       {string}      P_txt         string to be encoded
             * @return      {string}                    encoded (html-safe) string
             * Description Encode angle brackets and ampersand in text string
             */
            Util.prototype._EncodeEntities = function (P_txt) {
                return P_txt.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;'); // I1452 part 2
            };
            /**
             * Function     createShim
             * Scope        Public
             * Description  [Deprecated] Create an IFRAME element to go between KMW and drop down (to fix IE6 bug)
             * @deprecated
             */
            Util.prototype.createShim = function () {
                console.warn("The util.createShim function is deprecated, as its old functionality is no longer needed.  " +
                    "It and references to its previously-produced shims may be safely removed.");
                return;
            };
            // I1476 - Handle SELECT overlapping BEGIN
            /**
             * Function     showShim
             * Scope        Public
             * @param       {Object}      Pvkbd         Visual keyboard DIV element
             * @param       {Object}      Pframe        IFRAME shim element
             * @param       {Object}      Phelp         OSK Help DIV element
             * Description  [Deprecated] Display iFrame under OSK at its currently defined position, to allow OSK to overlap SELECT elements (IE6 fix)
             * @deprecated
             */
            Util.prototype.showShim = function (Pvkbd, Pframe, Phelp) {
                console.warn("The util.showShim function is deprecated, as its old functionality is no longer needed.  It may be safely removed.");
            };
            /**
             * Function     hideShim
             * Scope        Public
             * @param       {Object}      Pframe        IFRAME shim element
             * Description  [Deprecated] Hide iFrame shim containing OSK
             * @deprecated
             */
            Util.prototype.hideShim = function (Pframe) {
                console.warn("The util.hideShim function is deprecated, as its old functionality is no longer needed.  It may be safely removed.");
            };
            /**
             * Function     rgba
             * Scope        Public
             * @param       {Object}      s           element style object
             * @param       {number}      r           red value, 0-255
             * @param       {number}      g           green value, 0-255
             * @param       {number}      b           blue value, 0-255
             * @param       {number}      a           opacity value, 0-1.0
             * @return      {string}                  background colour style string
             * Description  Browser-independent alpha-channel management
             */
            Util.prototype.rgba = function (s, r, g, b, a) {
                var bgColor = 'transparent';
                try {
                    bgColor = 'rgba(' + r + ',' + g + ',' + b + ',' + a + ')';
                }
                catch (ex) {
                    bgColor = 'rgb(' + r + ',' + g + ',' + b + ')';
                }
                return bgColor;
            };
            /**
             * Add a stylesheet to a page programmatically, for use by the OSK, the UI or the page creator
             *
             * @param       {string}        s             style string
             * @return      {Object}                      returns the object reference
             **/
            Util.prototype.addStyleSheet = function (s) {
                var _ElemStyle = document.createElement('style');
                _ElemStyle.type = 'text/css';
                _ElemStyle.appendChild(document.createTextNode(s));
                var _ElemHead = document.getElementsByTagName('HEAD');
                if (_ElemHead.length > 0) {
                    _ElemHead[0].appendChild(_ElemStyle);
                }
                else {
                    document.body.appendChild(_ElemStyle); // Won't work on Chrome, ah well
                }
                this.linkedStylesheets.push(_ElemStyle);
                return _ElemStyle;
            };
            /**
             * Remove a stylesheet element
             *
             * @param       {Object}        s             style sheet reference
             * @return      {boolean}                     false if element is not a style sheet
             **/
            Util.prototype.removeStyleSheet = function (s) {
                if (s == null || typeof (s) != 'object') {
                    return false;
                }
                if (s.nodeName != 'STYLE') {
                    return false;
                }
                if (typeof (s.parentNode) == 'undefined' || s.parentNode == null) {
                    return false;
                }
                s.parentNode.removeChild(s);
                return true;
            };
            /**
             * Add a reference to an external stylesheet file
             *
             * @param   {string}  s   path to stylesheet file
             */
            Util.prototype.linkStyleSheet = function (s) {
                var headElements = document.getElementsByTagName('head');
                if (headElements.length > 0) {
                    var linkElement = document.createElement('link');
                    linkElement.type = 'text/css';
                    linkElement.rel = 'stylesheet';
                    linkElement.href = s;
                    this.linkedStylesheets.push(linkElement);
                    headElements[0].appendChild(linkElement);
                }
            };
            /**
             * Add a stylesheet with a font-face CSS descriptor for the embedded font appropriate
             * for the browser being used
             *
             * @param    {Object}  fd  keymanweb font descriptor
             **/
            Util.prototype.addFontFaceStyleSheet = function (fd) {
                // Test if a valid font descriptor
                if (typeof (fd) == 'undefined')
                    return;
                if (typeof (fd['files']) == 'undefined')
                    fd['files'] = fd['source'];
                if (typeof (fd['files']) == 'undefined')
                    return;
                var i, ttf = '', woff = '', eot = '', svg = '', fList = [];
                // TODO: 22 Aug 2014: check that font path passed from cloud is actually used!
                // Do not add a new font-face style sheet if already added for this font
                for (i = 0; i < this.embeddedFonts.length; i++) {
                    if (this.embeddedFonts[i] == fd['family']) {
                        return;
                    }
                }
                if (typeof (fd['files']) == 'string') {
                    fList[0] = fd['files'];
                }
                else {
                    fList = fd['files'];
                }
                for (i = 0; i < fList.length; i++) {
                    if (fList[i].toLowerCase().indexOf('.ttf') > 0)
                        ttf = fList[i];
                    if (fList[i].toLowerCase().indexOf('.woff') > 0)
                        woff = fList[i];
                    if (fList[i].toLowerCase().indexOf('.eot') > 0)
                        eot = fList[i];
                    if (fList[i].toLowerCase().indexOf('.svg') > 0)
                        svg = fList[i];
                }
                // Font path qualified to support page-relative fonts (build 347)
                if (ttf != '' && (ttf.indexOf('/') < 0)) {
                    ttf = this.keyman.options['fonts'] + ttf;
                }
                if (woff != '' && (woff.indexOf('/') < 0)) {
                    woff = this.keyman.options['fonts'] + woff;
                }
                if (eot != '' && (eot.indexOf('/') < 0)) {
                    eot = this.keyman.options['fonts'] + eot;
                }
                if (svg != '' && (svg.indexOf('/') < 0)) {
                    svg = this.keyman.options['fonts'] + svg;
                }
                // Build the font-face definition according to the browser being used
                var s = '@font-face {\nfont-family:'
                    + fd['family'] + ';\nfont-style:normal;\nfont-weight:normal;\n';
                // Detect if Internet Explorer and version if so
                var IE = keyman_3.Device._GetIEVersion();
                // Build the font source string according to the browser, 
                // but return without adding the style sheet if the required font type is unavailable
                // Modern browsers: use WOFF, TTF and fallback finally to SVG. Don't provide EOT
                if (IE >= 9) {
                    if (this.device.OS == 'iOS') {
                        if (ttf != '') {
                            // Modify the url if required to prevent caching  
                            ttf = this.unCached(ttf);
                            s = s + 'src:url(\'' + ttf + '\') format(\'truetype\');';
                        }
                        else {
                            return;
                        }
                    }
                    else {
                        var s0 = [];
                        if (this.device.OS == 'Android') {
                            // Android 4.2 and 4.3 have bugs in their rendering for some scripts 
                            // with embedded ttf or woff.  svg mostly works so is a better initial
                            // choice on the Android browser.
                            if (svg != '') {
                                s0.push("url('" + svg + "') format('svg')");
                            }
                            if (woff != '') {
                                s0.push("url('" + woff + "') format('woff')");
                            }
                            if (ttf != '') {
                                s0.push("url('" + ttf + "') format('truetype')");
                            }
                        }
                        else {
                            if (woff != '') {
                                s0.push("url('" + woff + "') format('woff')");
                            }
                            if (ttf != '') {
                                s0.push("url('" + ttf + "') format('truetype')");
                            }
                            if (svg != '') {
                                s0.push("url('" + svg + "') format('svg')");
                            }
                        }
                        if (s0.length == 0) {
                            return;
                        }
                        s += 'src:' + s0.join(',') + ';';
                    }
                }
                else { // IE 6-8
                    if (eot != '') {
                        s = s + 'src:url(\'' + eot + '\');';
                    }
                    else {
                        return;
                    }
                }
                s = s + '\n}\n';
                this.addStyleSheet(s);
                this.embeddedFonts.push(fd['family']);
            };
            /**
             * Allow forced reload if necessary (stub only here)
             *
             *  @param  {string}  s unmodified URL
             *  @return {string}    modified URL
             */
            Util.prototype.unCached = function (s) {
                // var t=(new Date().getTime());
                // s = s + '?v=' + t;
                return s;
            };
            /**
             * Document cookie parsing for use by kernel, OSK, UI etc.
             *
             * @param       {string=}       cn        cookie name (optional)
             * @return      {Object}                  array of names and strings, or array of variables and values
             */
            Util.prototype.loadCookie = function (cn) {
                var v = {};
                if (arguments.length > 0) {
                    var cx = this.loadCookie();
                    for (var t in cx) {
                        if (t == cn) {
                            var d = decodeURIComponent(cx[t]).split(';');
                            for (var i = 0; i < d.length; i++) {
                                var xc = d[i].split('=');
                                if (xc.length > 1) {
                                    v[xc[0]] = xc[1];
                                }
                                else {
                                    v[xc[0]] = '';
                                }
                            }
                        }
                    }
                }
                else {
                    if (typeof (document.cookie) != 'undefined' && document.cookie != '') {
                        var c = document.cookie.split(/;\s*/);
                        for (var i = 0; i < c.length; i++) {
                            var d = c[i].split('=');
                            if (d.length == 2) {
                                v[d[0]] = d[1];
                            }
                        }
                    }
                }
                return v;
            };
            /**
             * Standard cookie saving for use by kernel, OSK, UI etc.
             *
             * @param       {string}      cn            name of cookie
             * @param       {Object}      cv            object with array of named arguments and values
             */
            Util.prototype.saveCookie = function (cn, cv) {
                var s = '';
                for (var v in cv) {
                    s = s + v + '=' + cv[v] + ";";
                }
                var d = new Date(new Date().valueOf() + 1000 * 60 * 60 * 24 * 30).toUTCString();
                document.cookie = cn + '=' + encodeURIComponent(s) + '; path=/; expires=' + d; //Fri, 31 Dec 2099 23:59:59 GMT;';
            };
            /**
             * Function     toNumber
             * Scope        Public
             * @param       {string}      s            numeric string
             * @param       {number}      dflt         default value
             * @return      {number}
             * Description  Return string converted to integer or default value
             */
            Util.prototype.toNumber = function (s, dflt) {
                var x = parseInt(s, 10);
                return isNaN(x) ? dflt : x;
            };
            /**
             * Function     toNumber
             * Scope        Public
             * @param       {string}      s            numeric string
             * @param       {number}      dflt         default value
             * @return      {number}
             * Description  Return string converted to real value or default value
             */
            Util.prototype.toFloat = function (s, dflt) {
                var x = parseFloat(s);
                return isNaN(x) ? dflt : x;
            };
            /**
             * Function     toNzString
             * Scope        Public
             * @param       {*}           item         variable to test
             * @param       {?*=}         dflt         default value
             * @return      {*}
             * Description  Test if a variable is null, false, empty string, or undefined, and return as string
             */
            Util.prototype.nzString = function (item, dflt) {
                var dfltValue = '';
                if (arguments.length > 1) {
                    dfltValue = dflt;
                }
                if (typeof (item) == 'undefined') {
                    return dfltValue;
                }
                if (item == null) {
                    return dfltValue;
                }
                if (item == 0 || item == '') {
                    return dfltValue;
                }
                return '' + item;
            };
            /**
             * Function     deepCopy
             * Scope        Private
             * @param       {Object}      p           object to copy
             * @param       {Array=}      c0          array member being copied
             * @return      {Object}                  clone ('deep copy') of object
             * Description  Makes an actual copy (not a reference) of an object, copying simple members,
             *              arrays and member objects but not functions, so use with care!
             */
            Util.prototype.deepCopy = function (p, c0) {
                var c = c0 || {};
                for (var i in p) {
                    if (typeof p[i] === 'object') {
                        c[i] = (p[i].constructor === Array) ? [] : {};
                        this.deepCopy(p[i], c[i]);
                    }
                    else {
                        c[i] = p[i];
                    }
                }
                return c;
            };
            /**
             * Return the event target for any browser
             *
             * @param       {Event}      e        event
             * @return      {Object}              HTML element
             */
            Util.prototype.eventTarget = function (e) {
                if (!e) {
                    return null;
                }
                else if (e.target) { // most browsers
                    return e.target;
                }
                else if (e.srcElement) {
                    return e.srcElement;
                }
                else if (window.event) { //IE 8 (and earlier)
                    return window.event.srcElement;
                }
                else {
                    return null; // shouldn't happen!
                }
            };
            /**
             * Return the event type for any browser
             *
             * @param       {Event}      e        event
             * @return      {string}              type of event
             */
            Util.prototype.eventType = function (e) {
                if (e && e.type) { // most browsers
                    return e.type;
                }
                else if (window.event) { // IE 8 (and earlier)
                    return window.event.type;
                }
                else {
                    return ''; // shouldn't happen!
                }
            };
            /**
             * Customized alert
             *
             * @param     {string}        s       alert text
             * @param     {function()=}   fn      function to call when alert dismissed
             */
            Util.prototype.alert = function (s, fn) {
                var bg = this.waiting, nn = bg.firstChild.childNodes;
                nn[0].style.display = 'block';
                nn[1].className = 'kmw-alert-text';
                nn[1].innerHTML = s;
                nn[2].style.display = 'none';
                bg.style.display = 'block';
                if (arguments.length > 1) {
                    bg.dismiss = fn;
                }
                else {
                    bg.dismiss = null;
                }
            };
            // Stub definition to be fleshed out depending upon native/embedded mode.
            Util.prototype.wait = function (s) {
            };
            /**
             *  Prepare the background and keyboard loading wait message box
             *  Should not be called before options are defined during initialization
             **/
            Util.prototype.prepareWait = function () {
                var bg = document.createElement('DIV'), lb = document.createElement('DIV'), lt = document.createElement('DIV'), gr = document.createElement('DIV'), bx = document.createElement('DIV');
                bg.className = 'kmw-wait-background';
                lb.className = 'kmw-wait-box';
                bg.dismiss = null;
                lt.className = 'kmw-wait-text';
                gr.className = 'kmw-wait-graphic';
                bx.className = 'kmw-alert-close';
                // Close alert if anywhere in box is touched, since close box is too small on mobiles 
                lb.onmousedown = lb.onclick = function (e) {
                    // Ignore if waiting, only handle for alert
                    if (bx.style.display == 'block') {
                        bg.style.display = 'none';
                        if (bg.dismiss) {
                            bg.dismiss();
                        }
                    }
                };
                lb.addEventListener('touchstart', lb.onclick, false);
                bg.onmousedown = bg.onclick = function (e) {
                    e.preventDefault();
                    e.stopPropagation();
                };
                bg.addEventListener('touchstart', bg.onclick, false);
                lb.appendChild(bx);
                lb.appendChild(lt);
                lb.appendChild(gr);
                bg.appendChild(lb);
                document.body.appendChild(bg);
                this.waiting = bg;
            };
            Util.prototype.shutdown = function () {
                // Remove all event-handler references rooted in KMW events.
                this.events = {};
                // Remove all events linking to elements of the original, unaltered page.
                // This should sever any still-existing page ties to this instance of KMW,
                // allowing browser GC to do its thing.
                for (var _i = 0, _a = this.domEvents; _i < _a.length; _i++) {
                    var event_1 = _a[_i];
                    this.detachDOMEvent(event_1.Pelem, event_1.Peventname, event_1.Phandler, event_1.PuseCapture);
                }
                // Remove any KMW-added DOM element clutter.
                this.waiting.parentNode.removeChild(this.waiting);
                for (var _b = 0, _c = this.linkedStylesheets; _b < _c.length; _b++) {
                    var ss_1 = _c[_b];
                    if (ss_1.remove) {
                        ss_1.remove();
                    }
                    else if (ss_1.parentNode) {
                        ss_1.parentNode.removeChild(ss_1);
                    }
                }
            };
            /**
             * Get path of keymanweb script, for relative references
             *
             * *** This is not currently used, but may possibly be needed if ***
             * *** script identification during loading proves unreliable.   ***
             *
             *  @param    {string}      sName   filename prefix
             *  @return   {string}      path to source, with trailing slash
            **/
            Util.prototype.myPath = function (sName) {
                var i, scripts = document.getElementsByTagName('script'), ss;
                for (i = 0; i < scripts.length; i++) {
                    ss = scripts[i];
                    if (ss.src.indexOf(sName) >= 0) {
                        return ss.src.substr(0, ss.src.lastIndexOf('/') + 1);
                    }
                }
                return '';
            };
            // Prepend the appropriate protocol if not included in path
            Util.prototype.prependProtocol = function (path) {
                var pattern = new RegExp('^https?:');
                if (pattern.test(path)) {
                    return path;
                }
                else if (path.substr(0, 2) == '//') {
                    return this.keyman.protocol + path;
                }
                else if (path.substr(0, 1) == '/') {
                    return this.keyman.protocol + '/' + path;
                }
                else {
                    return this.keyman.protocol + '//' + path;
                }
            };
            /**
             * Return the appropriate test string for a given font
             *
             * TODO: Tidy up and remove arrays once 'sample' included in font metadata
             *
             *  @param  {Object}    fd    font meta-data object
             *  @return {string}          string to compare width
             *
             */
            Util.prototype.testString = function (fd) {
                var fontName = fd['family'], i, s = 'BESbswy';
                if ('sample' in fd && typeof (fd['sample']) == 'string') {
                    return s + fd['sample'];
                }
                var f = ['TamilWeb', 'TibetanWeb', 'LatinWeb', 'CherokeeWeb',
                    'EgyptianWeb', 'SinhalaWeb', 'KhmerWeb', 'ArabicWeb',
                    'BurmeseWeb', 'LaoWeb', 'OriyaWeb', 'GeezWeb'], t = ['\u0BBE\u0BF5', '\u0F7F\u0FD0', '\u02B0\u02A4', '\u13D0\u13C9',
                    '\uA723\uF7D3', '\u0DD8\u0DA3', '\u17D6\u178E', '\u0639\u06B3',
                    '\u1038\u1024', '\u0EC0\u0EDD', '\u0B03\u0B06', '\u1361\u132C'];
                for (i = 0; i < f.length; i++) {
                    if (fontName == f[i]) {
                        return s + t[i];
                    }
                }
                return s;
            };
            /**
             * Test if a font is installed (or available) on the target platform
             *
             * @param       {Object}        fd    font structure
             * @return      {boolean}             true if font available
             */
            Util.prototype.checkFont = function (fd) {
                var fontReady = false, fontName = fd['family'];
                // Create an absolute positioned div and two paragraph elements with spans for the test string.
                // The paragraph elements ensure that the spans are measured from the same point, otherwise
                // pixel rounding can result in different widths for the same string and styles.
                // Using a separate invisible DIV is more reliable than other positioning.
                var d = document.createElement('DIV'), ds = d.style, p1 = document.createElement('P'), p2 = document.createElement('P'), t1 = document.createElement('SPAN'), s1 = t1.style, t2 = document.createElement('SPAN'), s2 = t2.style;
                ds.position = 'absolute';
                ds.top = '10px';
                ds.left = '10px';
                ds.visibility = 'hidden';
                document.body.appendChild(d);
                d.appendChild(p1);
                d.appendChild(p2);
                p1.appendChild(t1);
                p2.appendChild(t2);
                // Firefox fails without the !important prefix on the fallback font, 
                // apparently applying the same font to both elements.
                // But it also fails to distinguish the two if !important is added to the test font!  
                // *** TODO: See if still true after changes Dec 2013 *** 
                // Must apply !important tag to font-family, but must apply it to the CSS style, not the JS object member
                // c.f. http://stackoverflow.com/questions/462537/overriding-important-style-using-javascript 
                t1.setAttribute('style', 'font-family:monospace !important');
                s2.fontFamily = fontName + ',monospace';
                s1.fontSize = s2.fontSize = '24px'; // Not too large, to avoid wrapping or overflow 
                // Include narrow and wide characters from each unique script
                t1.innerHTML = t2.innerHTML = this.testString(fd);
                // Compare the actual width of each span. Checking monospace, serif, 
                // and sans-serif helps to avoid falsely reporting the font as ready
                // The width must be different for all three tests.
                if (t1.offsetWidth != t2.offsetWidth) {
                    t1.setAttribute('style', 'font-family:sans-serif !important');
                    s2.fontFamily = fontName + ',sans-serif';
                    if (t1.offsetWidth != t2.offsetWidth) {
                        t1.setAttribute('style', 'font-family:serif !important');
                        s2.fontFamily = fontName + ',serif';
                    }
                }
                fontReady = (t1.offsetWidth != t2.offsetWidth);
                // Delete test elements
                p1.removeChild(t1);
                p2.removeChild(t2);
                d.removeChild(p1);
                d.removeChild(p2);
                document.body.removeChild(d);
                return fontReady;
            };
            /**
             * Check a font descriptor for font availability, returning true if undefined
             *
             *  @param  {Object}  fd  font descriptor member of keyboard stub
             *  @return {boolean}
             **/
            Util.prototype.checkFontDescriptor = function (fd) {
                if (typeof (fd) == 'undefined' || typeof (fd['family']) != 'string') {
                    return true;
                }
                return this.checkFont(fd);
            };
            /**
             * Checks the type of an input DOM-related object while ensuring that it is checked against the correct prototype,
             * as class prototypes are (by specification) scoped upon the owning Window.
             *
             * See https://stackoverflow.com/questions/43587286/why-does-instanceof-return-false-on-chrome-safari-and-edge-and-true-on-firefox
             * for more details.
             *
             * @param {Element|Event}   Pelem       An element of the web page or one of its IFrame-based subdocuments.
             * @param {string}          className   The plain-text name of the expected Element type.
             * @return {boolean}
             */
            Util.instanceof = function (Pelem, className) {
                var scopedClass;
                if (Pelem['Window']) { // Window objects contain the class definitions for types held within them.  So, we can check for those.
                    return className == 'Window';
                }
                else if (Pelem['defaultView']) { // Covers Document.
                    scopedClass = Pelem['defaultView'][className];
                }
                else if (Pelem['ownerDocument']) {
                    scopedClass = Pelem.ownerDocument.defaultView[className];
                }
                else if (Pelem['target']) {
                    var event = Pelem;
                    if (this.instanceof(event.target, 'Window')) {
                        scopedClass = event.target[className];
                    }
                    else if (this.instanceof(event.target, 'Document')) {
                        scopedClass = event.target.defaultView[className];
                    }
                    else if (this.instanceof(event.target, 'HTMLElement')) {
                        scopedClass = event.target.ownerDocument.defaultView[className];
                    }
                }
                if (scopedClass) {
                    return Pelem instanceof scopedClass;
                }
                else {
                    return false;
                }
            };
            return Util;
        }());
        keyman_3.Util = Util;
    })(keyman = com.keyman || (com.keyman = {}));
})(com || (com = {}));
var Util = com.keyman.Util;
/// <reference path="kmwexthtml.ts" />  // Includes KMW-added property declaration extensions for HTML elements.
/// <reference path="kmwtypedefs.ts" /> // Includes type definitions for basic KMW types.
/// <reference path="kmwbase.ts" />
/***
   KeymanWeb 11.0
   Copyright 2019 SIL International
***/
var com;
(function (com) {
    var keyman;
    (function (keyman) {
        var RuleDeadkey = /** @class */ (function () {
            function RuleDeadkey() {
            }
            return RuleDeadkey;
        }());
        var ContextAny = /** @class */ (function () {
            function ContextAny() {
            }
            return ContextAny;
        }());
        var RuleIndex = /** @class */ (function () {
            function RuleIndex() {
            }
            return RuleIndex;
        }());
        var ContextEx = /** @class */ (function () {
            function ContextEx() {
            }
            return ContextEx;
        }());
        var ContextNul = /** @class */ (function () {
            function ContextNul() {
            }
            return ContextNul;
        }());
        var StoreBeep = /** @class */ (function () {
            function StoreBeep() {
            }
            return StoreBeep;
        }());
        /**
         * Cache of context storing and retrieving return values from KC
         * Must be reset prior to each keystroke and after any text changes
         * MCD 3/1/14
         **/
        var CachedContext = /** @class */ (function () {
            function CachedContext() {
            }
            CachedContext.prototype.reset = function () {
                this._cache = [];
            };
            CachedContext.prototype.get = function (n, ln) {
                // return null; // uncomment this line to disable context caching
                if (typeof this._cache[n] == 'undefined') {
                    return null;
                }
                else if (typeof this._cache[n][ln] == 'undefined') {
                    return null;
                }
                return this._cache[n][ln];
            };
            CachedContext.prototype.set = function (n, ln, val) {
                if (typeof this._cache[n] == 'undefined') {
                    this._cache[n] = [];
                }
                this._cache[n][ln] = val;
            };
            return CachedContext;
        }());
        ;
        /**
         * An extended version of cached context storing designed to work with
         * `fullContextMatch` and its helper functions.
         */
        var CachedContextEx = /** @class */ (function () {
            function CachedContextEx() {
            }
            CachedContextEx.prototype.reset = function () {
                this._cache = [];
            };
            CachedContextEx.prototype.get = function (n, ln) {
                // return null; // uncomment this line to disable context caching
                if (typeof this._cache[n] == 'undefined') {
                    return null;
                }
                else if (typeof this._cache[n][ln] == 'undefined') {
                    return null;
                }
                return this._cache[n][ln];
            };
            CachedContextEx.prototype.set = function (n, ln, val) {
                if (typeof this._cache[n] == 'undefined') {
                    this._cache[n] = [];
                }
                this._cache[n][ln] = val;
            };
            return CachedContextEx;
        }());
        ;
        // Defines the base Deadkey-tracking object.
        var Deadkey = /** @class */ (function () {
            function Deadkey(pos, id) {
                this.p = pos;
                this.d = id;
                this.o = Deadkey.ordinalSeed++;
            }
            Deadkey.prototype.match = function (p, d) {
                var result = (this.p == p && this.d == d);
                return result;
            };
            Deadkey.prototype.set = function () {
                this.matched = 1;
            };
            Deadkey.prototype.reset = function () {
                this.matched = 0;
            };
            Deadkey.prototype.before = function (other) {
                return this.o < other.o;
            };
            Deadkey.ordinalSeed = 0;
            return Deadkey;
        }());
        var BeepData = /** @class */ (function () {
            function BeepData(e) {
                this.e = e;
                this.c = e.style.backgroundColor;
            }
            BeepData.prototype.reset = function () {
                this.e.style.backgroundColor = this.c;
            };
            return BeepData;
        }());
        var KeyboardInterface = /** @class */ (function () {
            function KeyboardInterface(kmw) {
                this.cachedContext = new CachedContext();
                this.cachedContextEx = new CachedContextEx();
                this.TSS_LAYER = 33;
                this.TSS_PLATFORM = 31;
                this._AnyIndices = []; // AnyIndex - array of any/index match indices
                this._BeepObjects = []; // BeepObjects - maintains a list of active 'beep' visual feedback elements
                this._BeepTimeout = 0; // BeepTimeout - a flag indicating if there is an active 'beep'. 
                // Set to 1 if there is an active 'beep', otherwise leave as '0'.
                this._DeadKeys = []; // DeadKeys - array of matched deadkeys
                /**
                 * Function     _CacheCommands
                 * Scope        Private
                 * @param       {Object}    _Document
                 * @return      {Array.<string>}        List of style commands that are cacheable
                 * Description  Build reate list of styles that can be applied in iframes
                 */
                this._CacheCommands = function (_Document) {
                    //var _CacheableBackColor='backcolor';
                    var _CacheableCommands = [
                        new keyman.StyleCommand('backcolor', 1), new keyman.StyleCommand('fontname', 1), new keyman.StyleCommand('fontsize', 1),
                        new keyman.StyleCommand('forecolor', 1), new keyman.StyleCommand('bold', 0), new keyman.StyleCommand('italic', 0),
                        new keyman.StyleCommand('strikethrough', 0), new keyman.StyleCommand('subscript', 0),
                        new keyman.StyleCommand('superscript', 0), new keyman.StyleCommand('underline', 0)
                    ];
                    if (_Document.defaultView) {
                        this.keymanweb._push(_CacheableCommands, ['hilitecolor', 1]);
                    }
                    for (var n = 0; n < _CacheableCommands.length; n++) { // I1511 - array prototype extended
                        //KeymanWeb._Debug('Command:'+_CacheableCommands[n][0]);
                        this.keymanweb._push(_CacheableCommands[n], _CacheableCommands[n][1] ?
                            _Document.queryCommandValue(_CacheableCommands[n][0]) :
                            _Document.queryCommandState(_CacheableCommands[n][0]));
                    }
                    return _CacheableCommands;
                };
                /**
                 * Function     _CacheCommandReset
                 * Scope        Private
                 * @param       {Object} _Document
                 *             _CacheableCommands
                 *             _func
                 * Description  Restore styles in IFRAMEs (??)
                 */
                this._CacheCommandsReset = function (_Document, _CacheableCommands, _func) {
                    for (var n = 0; n < _CacheableCommands.length; n++) { // I1511 - array prototype extended
                        //KeymanWeb._Debug('ResetCacheCommand:'+_CacheableCommands[n][0]+'='+_CacheableCommands[n][2]);
                        if (_CacheableCommands[n][1]) {
                            if (_Document.queryCommandValue(_CacheableCommands[n][0]) != _CacheableCommands[n][2]) {
                                if (_func) {
                                    _func();
                                }
                                _Document.execCommand(_CacheableCommands[n][0], false, _CacheableCommands[n][2]);
                            }
                        }
                        else if (_Document.queryCommandState(_CacheableCommands[n][0]) != _CacheableCommands[n][2]) {
                            if (_func) {
                                _func();
                            }
                            //KeymanWeb._Debug('executing command '+_CacheableCommand[n][0]);
                            _Document.execCommand(_CacheableCommands[n][0], false, null);
                        }
                    }
                };
                this.clearDeadkeys = function () {
                    this._DeadKeys = [];
                };
                this.keymanweb = kmw;
            }
            /**
             * Function     KSF
             * Scope        Public
             * Description  Save keyboard focus
             */
            KeyboardInterface.prototype.saveFocus = function () {
                keyman.DOMEventHandlers.states._IgnoreNextSelChange = 1;
            };
            /**
             * Function     KT
             * Scope        Public
             * @param       {string}      Ptext     Text to insert
             * @param       {?number}     PdeadKey  Dead key number, if any (???)
             * @return      {boolean}               true if inserted
             * Description  Insert text into active control
             */
            KeyboardInterface.prototype.insertText = function (Ptext, PdeadKey) {
                this.resetContextCache();
                //_DebugEnter('InsertText');
                var Lelem = this.keymanweb.domManager.getLastActiveElement(), Ls, Le, Lkc, Lv = false;
                if (Lelem != null) {
                    Ls = Lelem._KeymanWebSelectionStart;
                    Le = Lelem._KeymanWebSelectionEnd;
                    this.keymanweb.uiManager.setActivatingUI(true);
                    keyman.DOMEventHandlers.states._IgnoreNextSelChange = 100;
                    this.keymanweb.domManager.focusLastActiveElement();
                    if (Lelem.ownerDocument && Lelem instanceof Lelem.ownerDocument.defaultView.HTMLIFrameElement
                        && this.keymanweb.domManager._IsMozillaEditableIframe(Lelem, 0)) {
                        Lelem = Lelem.documentElement; // I3363 (Build 301)
                    }
                    Lelem._KeymanWebSelectionStart = Ls;
                    Lelem._KeymanWebSelectionEnd = Le;
                    keyman.DOMEventHandlers.states._IgnoreNextSelChange = 0;
                    if (Ptext != null) {
                        this.output(0, Lelem, Ptext);
                    }
                    if ((typeof (PdeadKey) !== 'undefined') && (PdeadKey !== null)) {
                        this.deadkeyOutput(0, Lelem, PdeadKey);
                    }
                    Lelem._KeymanWebSelectionStart = null;
                    Lelem._KeymanWebSelectionEnd = null;
                    Lv = true;
                }
                //_DebugExit('InsertText');
                return Lv;
            };
            /**
             * Function     registerKeyboard  KR
             * Scope        Public
             * @param       {Object}      Pk      Keyboard  object
             * Description  Register and load the keyboard
             */
            KeyboardInterface.prototype.registerKeyboard = function (Pk) {
                this.keymanweb.keyboardManager._registerKeyboard(Pk);
            };
            /**
             * Add the basic keyboard parameters (keyboard stub) to the array of keyboard stubs
             * If no language code is specified in a keyboard it cannot be registered,
             * and a keyboard stub must be registered before the keyboard is loaded
             * for the keyboard to be usable.
             *
             * @param       {Object}      Pstub     Keyboard stub object
             * @return      {?number}               1 if already registered, else null
             */
            KeyboardInterface.prototype.registerStub = function (Pstub) {
                return this.keymanweb.keyboardManager._registerStub(Pstub);
            };
            /**
             * Get *cached or uncached* keyboard context for a specified range, relative to caret
             *
             * @param       {number}      n       Number of characters to move back from caret
             * @param       {number}      ln      Number of characters to return
             * @param       {Object}      Pelem   Element to work with (must be currently focused element)
             * @return      {string}              Context string
             *
             * Example     [abcdef|ghi] as INPUT, with the caret position marked by |:
             *             KC(2,1,Pelem) == "e"
             *             KC(3,3,Pelem) == "def"
             *             KC(10,10,Pelem) == "abcdef"  i.e. return as much as possible of the requested string
             */
            KeyboardInterface.prototype.context = function (n, ln, Pelem) {
                var v = this.cachedContext.get(n, ln);
                if (v !== null) {
                    return v;
                }
                var r = this.keymanweb.KC_(n, ln, Pelem);
                this.cachedContext.set(n, ln, r);
                return r;
            };
            /**
             * Function     nul           KN
             * Scope        Public
             * @param       {number}      n       Length of context to check
             * @param       {Object}      Ptarg   Element to work with (must be currently focused element)
             * @return      {boolean}             True if length of context is less than or equal to n
             * Description  Test length of context, return true if the length of the context is less than or equal to n
             *
             * Example     [abc|def] as INPUT, with the caret position marked by |:
             *             KN(3,Pelem) == TRUE
             *             KN(2,Pelem) == FALSE
             *             KN(4,Pelem) == TRUE
             */
            KeyboardInterface.prototype.nul = function (n, Ptarg) {
                var cx = this.context(n + 1, 1, Ptarg);
                // With #31, the result will be a replacement character if context is empty.
                return cx === "\uFFFE";
            };
            /**
             * Function     contextMatch  KCM
             * Scope        Public
             * @param       {number}      n       Number of characters to move back from caret
             * @param       {Object}      Ptarg   Focused element
             * @param       {string}      val     String to match
             * @param       {number}      ln      Number of characters to return
             * @return      {boolean}             True if selected context matches val
             * Description  Test keyboard context for match
             */
            KeyboardInterface.prototype.contextMatch = function (n, Ptarg, val, ln) {
                //KeymanWeb._Debug('KeymanWeb.KCM(n='+n+', Ptarg, val='+val+', ln='+ln+'): return '+(kbdInterface.context(n,ln,Ptarg)==val)); 
                var cx = this.context(n, ln, Ptarg);
                if (cx === val) {
                    return true; // I3318
                }
                this._DeadkeyResetMatched(); // I3318
                return false;
            };
            /**
             * Builds the *cached or uncached* keyboard context for a specified range, relative to caret
             *
             * @param       {number}      n       Number of characters to move back from caret
             * @param       {number}      ln      Number of characters to return
             * @param       {Object}      Pelem   Element to work with (must be currently focused element)
             * @return      {Array}               Context array (of strings and numbers)
             */
            KeyboardInterface.prototype._BuildExtendedContext = function (n, ln, Ptarg) {
                var cache = this.cachedContextEx.get(n, ln);
                if (cache !== null) {
                    return cache;
                }
                else {
                    // By far the easiest way to correctly build what we want is to start from the right and work to what we need.
                    // We may have done it for a similar cursor position before.
                    cache = this.cachedContextEx.get(n, n);
                    if (cache === null) {
                        // First, let's make sure we have a cloned, sorted copy of the deadkey array.
                        this._DeadKeys.sort(function (a, b) {
                            // We want descending order, so we want 'later' deadkeys first.
                            if (a.p != b.p) {
                                return b.p - a.p;
                            }
                            else {
                                return b.o - a.o;
                            }
                        });
                        var unmatchedDeadkeys = [].concat(this._DeadKeys);
                        // Time to build from scratch!
                        var index = 0;
                        cache = { valContext: [], deadContext: [] };
                        while (cache.valContext.length < n) {
                            // As adapted from `deadkeyMatch`.
                            var sp = this._SelPos(Ptarg);
                            var deadPos = sp - index;
                            if (unmatchedDeadkeys.length > 0 && unmatchedDeadkeys[0].p == deadPos) {
                                // Take the deadkey.
                                cache.deadContext[n - cache.valContext.length - 1] = unmatchedDeadkeys[0];
                                cache.valContext = [unmatchedDeadkeys[0].d].concat(cache.valContext);
                                unmatchedDeadkeys.splice(0, 1);
                            }
                            else {
                                // Take the character.  We get "\ufffe" if it doesn't exist.
                                var kc = this.context(++index, 1, Ptarg);
                                cache.valContext = [kc].concat(cache.valContext);
                            }
                        }
                        this.cachedContextEx.set(n, n, cache);
                    }
                    // Now that we have the cache...
                    var subCache = cache;
                    subCache.valContext = subCache.valContext.slice(0, ln);
                    for (var i = 0; i < subCache.valContext.length; i++) {
                        if (subCache[i] == '\ufffe') {
                            subCache.valContext.splice(0, 1);
                            subCache.deadContext.splice(0, 1);
                        }
                    }
                    if (subCache.valContext.length == 0) {
                        subCache.valContext = ['\ufffe'];
                        subCache.deadContext = [];
                    }
                    this.cachedContextEx.set(n, ln, subCache);
                    return subCache;
                }
            };
            /**
             * Function       fullContextMatch    KFCM
             * Scope          Private
             * @param         {number}    n       Number of characters to move back from caret
             * @param         {Object}    Ptarg   Focused element
             * @param         {Array}     rule    An array of ContextEntries to match.
             * @return        {boolean}           True if the fully-specified rule context matches the current KMW state.
             *
             * A KMW 10+ function designed to bring KMW closer to Keyman Desktop functionality,
             * near-directly modeling (externally) the compiled form of Desktop rules' context section.
             */
            KeyboardInterface.prototype.fullContextMatch = function (n, Ptarg, rule) {
                // Stage one:  build the context index map.
                var fullContext = this._BuildExtendedContext(n, rule.length, Ptarg);
                var context = fullContext.valContext;
                var deadContext = fullContext.deadContext;
                var mismatch = false;
                // This symbol internally indicates lack of context in a position.  (See KC_)
                var NUL_CONTEXT = "\uFFFE";
                var assertNever = function (x) {
                    // Could be accessed by improperly handwritten calls to `fullContextMatch`.
                    throw new Error("Unexpected object in fullContextMatch specification: " + x);
                };
                // Stage two:  time to match against the rule specified.
                for (var i = 0; i < rule.length; i++) {
                    if (typeof rule[i] == 'string') {
                        var str = rule[i];
                        if (str !== context[i]) {
                            mismatch = true;
                            break;
                        }
                    }
                    else {
                        // TypeScript needs a cast to this intermediate type to do its discriminated union magic.
                        var r = rule[i];
                        switch (r.t) {
                            case 'd':
                                // We still need to set a flag here; 
                                if (r['d'] !== context[i]) {
                                    mismatch = true;
                                }
                                else {
                                    deadContext[i].set();
                                }
                                break;
                            case 'a':
                                var lookup;
                                if (typeof context[i] == 'string') {
                                    lookup = context[i];
                                }
                                else {
                                    lookup = { 't': 'd', 'd': context[i] };
                                }
                                var result = this.any(i, lookup, r.a);
                                if (!r.n) { // If it's a standard 'any'...
                                    if (!result) {
                                        mismatch = true;
                                    }
                                    else if (deadContext[i] !== undefined) {
                                        // It's a deadkey match, so indicate that.
                                        deadContext[i].set();
                                    }
                                    // 'n' for 'notany'.  If we actually match or if we have nul context (\uFFFE), notany fails.
                                }
                                else if (r.n && (result || context[i] !== NUL_CONTEXT)) {
                                    mismatch = true;
                                }
                                break;
                            case 'i':
                                // The context will never hold a 'beep.'
                                var ch = this._Index(r.i, r.o);
                                if (ch !== undefined && (typeof (ch) == 'string' ? ch : ch.d) !== context[i]) {
                                    mismatch = true;
                                }
                                else if (deadContext[i] !== undefined) {
                                    deadContext[i].set();
                                }
                                break;
                            case 'c':
                                if (context[r.c - 1] !== context[i]) {
                                    mismatch = true;
                                }
                                else if (deadContext[i] !== undefined) {
                                    deadContext[i].set();
                                }
                                break;
                            case 'n':
                                // \uFFFE is the internal 'no context here sentinel'.
                                if (context[i] != NUL_CONTEXT) {
                                    mismatch = true;
                                }
                                break;
                            default:
                                assertNever(r);
                        }
                    }
                }
                if (mismatch) {
                    // Reset the matched 'any' indices, if any.
                    this._DeadkeyResetMatched();
                    this._AnyIndices = [];
                }
                return !mismatch;
            };
            /**
             * Function     KIK
             * Scope        Public
             * @param       {Object}  e   keystroke event
             * @return      {boolean}     true if keypress event
             * Description  Test if event as a keypress event
             */
            KeyboardInterface.prototype.isKeypress = function (e) {
                if (this.keymanweb.keyboardManager.activeKeyboard['KM']) { // I1380 - support KIK for positional layouts
                    return !e.LisVirtualKey; // will now return true for U_xxxx keys, but not for T_xxxx keys
                }
                else {
                    return this.keymanweb.keyMapManager._USKeyCodeToCharCode(e) ? true : false; // I1380 - support KIK for positional layouts
                }
            };
            /**
             * Function     keyMatch      KKM
             * Scope        Public
             * @param       {Object}      e           keystroke event
             * @param       {number}      Lruleshift
             * @param       {number}      Lrulekey
             * @return      {boolean}                 True if key matches rule
             * Description  Test keystroke with modifiers against rule
             */
            KeyboardInterface.prototype.keyMatch = function (e, Lruleshift, Lrulekey) {
                var retVal = false; // I3318
                var keyCode = (e.Lcode == 173 ? 189 : e.Lcode); //I3555 (Firefox hyphen issue)
                var bitmask = this.keymanweb.keyboardManager.getKeyboardModifierBitmask();
                var modifierBitmask = bitmask & this.keymanweb.osk.modifierBitmasks["ALL"];
                var stateBitmask = bitmask & this.keymanweb.osk.stateBitmasks["ALL"];
                if (e.vkCode > 255) {
                    keyCode = e.vkCode; // added to support extended (touch-hold) keys for mnemonic layouts
                }
                if (e.LisVirtualKey || keyCode > 255) {
                    if ((Lruleshift & 0x4000) == 0x4000 || (keyCode > 255)) { // added keyCode test to support extended keys
                        retVal = ((Lrulekey == keyCode) && ((Lruleshift & modifierBitmask) == e.Lmodifiers)); //I3318, I3555
                        retVal = retVal && this.stateMatch(e, Lruleshift & stateBitmask);
                    }
                }
                else if ((Lruleshift & 0x4000) == 0) {
                    retVal = (keyCode == Lrulekey); // I3318, I3555
                }
                if (!retVal) {
                    this._DeadkeyResetMatched(); // I3318
                }
                return retVal; // I3318
            };
            ;
            /**
             * Function     stateMatch    KSM
             * Scope        Public
             * @param       {Object}      e       keystroke event
             * @param       {number}      Lstate
             * Description  Test keystroke against state key rules
             */
            KeyboardInterface.prototype.stateMatch = function (e, Lstate) {
                return ((Lstate & e.Lstates) == Lstate);
            };
            /**
             * Function     keyInformation  KKI
             * Scope        Public
             * @param       {Object}      e
             * @return      {Object}              Object with event's virtual key flag, key code, and modifiers
             * Description  Get object with extended key event information
             */
            KeyboardInterface.prototype.keyInformation = function (e) {
                var ei = new keyman.KeyInformation();
                ei['vk'] = e.LisVirtualKey;
                ei['code'] = e.Lcode;
                ei['modifiers'] = e.Lmodifiers;
                return ei;
            };
            ;
            /**
             * Function     deadkeyMatch  KDM
             * Scope        Public
             * @param       {number}      n       current cursor position
             * @param       {Object}      Ptarg   target element
             * @param       {number}      d       deadkey
             * @return      {boolean}             True if deadkey found selected context matches val
             * Description  Match deadkey at current cursor position
             */
            KeyboardInterface.prototype.deadkeyMatch = function (n, Ptarg, d) {
                if (this._DeadKeys.length == 0) {
                    return false; // I3318
                }
                var sp = this._SelPos(Ptarg);
                n = sp - n;
                for (var i = 0; i < this._DeadKeys.length; i++) {
                    // Don't re-match an already-matched deadkey.  It's possible to have two identical 
                    // entries, and they should be kept separately.
                    if (this._DeadKeys[i].match(n, d) && !this._DeadKeys[i].matched) {
                        this._DeadKeys[i].set();
                        // Assumption:  since we match the first possible entry in the array, we
                        // match the entry with the lower ordinal - the 'first' deadkey in the position.
                        return true; // I3318
                    }
                }
                this._DeadkeyResetMatched(); // I3318
                return false;
            };
            /**
             * Function     beepReset   KBR
             * Scope        Public
             * Description  Reset/terminate beep or flash (not currently used: Aug 2011)
             */
            KeyboardInterface.prototype.beepReset = function () {
                this.resetContextCache();
                var Lbo;
                this._BeepTimeout = 0;
                for (Lbo = 0; Lbo < this._BeepObjects.length; Lbo++) { // I1511 - array prototype extended
                    this._BeepObjects[Lbo].reset();
                }
                this._BeepObjects = [];
            };
            /**
             * Function     beep          KB
             * Scope        Public
             * @param       {Object}      Pelem     element to flash
             * Description  Flash body as substitute for audible beep; notify embedded device to vibrate
             */
            KeyboardInterface.prototype.beep = function (Pelem) {
                this.resetContextCache();
                var Pdoc = Pelem; // Shorthand for following if, which verifies if it actually IS a Document.
                if (Pdoc.defaultView && Pelem instanceof Pdoc.defaultView.Document) {
                    Pelem = Pdoc.body; // I1446 - beep sometimes fails to flash when using OSK and rich control
                }
                Pelem = Pelem; // After previous block, true.
                if (!Pelem.style || typeof (Pelem.style.backgroundColor) == 'undefined') {
                    return;
                }
                for (var Lbo = 0; Lbo < this._BeepObjects.length; Lbo++) { // I1446 - beep sometimes fails to return background color to normal
                    // I1511 - array prototype extended
                    if (this._BeepObjects[Lbo].e == Pelem) {
                        return;
                    }
                }
                this._BeepObjects = this.keymanweb._push(this._BeepObjects, new BeepData(Pelem));
                Pelem.style.backgroundColor = '#000000';
                if (this._BeepTimeout == 0) {
                    this._BeepTimeout = 1;
                    window.setTimeout(this.beepReset.bind(this), 50);
                }
                if ('beepKeyboard' in this.keymanweb) {
                    this.keymanweb['beepKeyboard']();
                }
            };
            KeyboardInterface.prototype._ExplodeStore = function (store) {
                if (typeof (store) == 'string') {
                    var kbdTag = this.keymanweb.keyboardManager.getActiveKeyboardTag();
                    // Is the result cached?
                    if (kbdTag.stores[store]) {
                        return kbdTag.stores[store];
                    }
                    // Nope, so let's build its cache.
                    var result = [];
                    for (var i = 0; i < store._kmwLength(); i++) {
                        result.push(store._kmwCharAt(i));
                    }
                    // Cache the result for later!
                    kbdTag.stores[store] = result;
                    return result;
                }
                else {
                    return store;
                }
            };
            /**
             * Function     any           KA
             * Scope        Public
             * @param       {number}      n     character position (index)
             * @param       {string}      ch    character to find in string
             * @param       {string}      s     'any' string
             * @return      {boolean}           True if character found in 'any' string, sets index accordingly
             * Description  Test for character matching
             */
            KeyboardInterface.prototype.any = function (n, ch, s) {
                if (ch == '') {
                    return false;
                }
                s = this._ExplodeStore(s);
                var Lix = -1;
                for (var i = 0; i < s.length; i++) {
                    if (typeof (s[i]) == 'string') {
                        if (s[i] == ch) {
                            Lix = i;
                            break;
                        }
                    }
                    else if (s[i]['d'] === ch['d']) {
                        Lix = i;
                        break;
                    }
                }
                this._AnyIndices[n] = Lix;
                return Lix >= 0;
            };
            /**
             * Function     _Index
             * Scope        Public
             * @param       {string}      Ps      string
             * @param       {number}      Pn      index
             * Description  Returns the character from a store string according to the offset in the index array
             */
            KeyboardInterface.prototype._Index = function (Ps, Pn) {
                Ps = this._ExplodeStore(Ps);
                if (this._AnyIndices[Pn - 1] < Ps.length) { //I3319
                    return Ps[this._AnyIndices[Pn - 1]];
                }
                else {
                    /* Should not be possible for a compiled keyboard, but may arise
                    * during the development of handwritten keyboards.
                    */
                    console.warn("Unmatched contextual index() statement detected in rule with index " + Pn + "!");
                    return "";
                }
            };
            /**
             * Function     indexOutput   KIO
             * Scope        Public
             * @param       {number}      Pdn     no of character to overwrite (delete)
             * @param       {string}      Ps      string
             * @param       {number}      Pn      index
             * @param       {Object}      Pelem   element to output to
             * Description  Output a character selected from the string according to the offset in the index array
             */
            KeyboardInterface.prototype.indexOutput = function (Pdn, Ps, Pn, Pelem) {
                this.resetContextCache();
                var assertNever = function (x) {
                    // Could be accessed by improperly handwritten calls to `fullContextMatch`.
                    throw new Error("Unexpected object in fullContextMatch specification: " + x);
                };
                var indexChar = this._Index(Ps, Pn);
                if (indexChar !== "") {
                    if (typeof indexChar == 'string') {
                        this.output(Pdn, Pelem, indexChar); //I3319
                    }
                    else if (indexChar['t']) {
                        var storeEntry = indexChar;
                        switch (storeEntry.t) {
                            case 'b': // Beep commands may appear within stores.
                                this.beep(Pelem);
                                break;
                            case 'd':
                                this.deadkeyOutput(Pdn, Pelem, indexChar['d']);
                                break;
                            default:
                                assertNever(storeEntry);
                        }
                    }
                    else { // For keyboards developed during 10.0's alpha phase - t:'d' was assumed.
                        this.deadkeyOutput(Pdn, Pelem, indexChar['d']);
                    }
                }
            };
            /**
             * Function     deleteContext KDC
             * Scope        Public
             * @param       {number}      dn      number of context entries to overwrite
             * @param       {Object}      Pelem   element to output to
             * @param       {string}      s       string to output
             * Description  Keyboard output
             */
            KeyboardInterface.prototype.deleteContext = function (dn, Pelem) {
                var context;
                // We want to control exactly which deadkeys get removed.
                if (dn > 0) {
                    context = this._BuildExtendedContext(dn, dn, Pelem);
                    for (var i = 0; i < context.deadContext.length; i++) {
                        var dk = context.deadContext[i];
                        if (dk) {
                            // Remove deadkey in context.
                            var index = this._DeadKeys.indexOf(dk);
                            this._DeadKeys.splice(index, 1);
                            // Reduce our reported context size.
                            dn--;
                        }
                    }
                }
                // If a matched deadkey hasn't been deleted, we don't WANT to delete it.
                this._DeadkeyResetMatched();
                // Why reinvent the wheel?  Delete the remaining characters by 'inserting a blank string'.
                this.output(dn, Pelem, '');
            };
            /**
             * Function     output        KO
             * Scope        Public
             * @param       {number}      dn      number of characters to overwrite
             * @param       {Object}      Pelem   element to output to
             * @param       {string}      s       string to output
             * Description  Keyboard output
             */
            KeyboardInterface.prototype.output = function (dn, Pelem, s) {
                this.resetContextCache();
                // KeymanTouch for Android uses direct insertion of the character string
                if ('oninserttext' in this.keymanweb) {
                    this.keymanweb['oninserttext'](dn, s);
                }
                var Ldoc;
                if (Pelem.body) {
                    Ldoc = Pelem;
                }
                else {
                    Ldoc = Pelem.ownerDocument; // I1481 - integration with rich editors not working 100%
                }
                var Li, Ldv;
                if (Pelem.className.indexOf('keymanweb-input') >= 0) {
                    var t = this.keymanweb.touchAliasing.getTextBeforeCaret(Pelem);
                    if (dn > 0) {
                        t = t._kmwSubstr(0, t._kmwLength() - dn) + s;
                    }
                    else {
                        t = t + s;
                    }
                    this.keymanweb.touchAliasing.setTextBeforeCaret(Pelem, t);
                    // Adjust deadkey positions
                    this._DeadkeyDeleteMatched(); // I3318
                    if (dn >= 0) {
                        this._DeadkeyAdjustPos(this._SelPos(Pelem), -dn + s._kmwLength()); // I3318,I3319
                    }
                    if ((dn >= 0 || s) && Pelem == keyman.DOMEventHandlers.states.activeElement) {
                        // Record that we've made an edit.
                        keyman.DOMEventHandlers.states.changed = true;
                    }
                    return;
                }
                if (Ldoc && (Ldv = Ldoc.defaultView) && Ldv.getSelection &&
                    (Ldoc.designMode.toLowerCase() == 'on' || Pelem.contentEditable == 'true' || Pelem.contentEditable == 'plaintext-only' || Pelem.contentEditable === '')) { // I2457 - support contentEditable elements in mozilla, webkit
                    /* Editable iframe and contentEditable elements for mozilla */
                    var _IsEditableIframe = Ldoc.designMode.toLowerCase() == 'on';
                    if (_IsEditableIframe) {
                        var _CacheableCommands = this._CacheCommands(Ldoc);
                    }
                    var Lsel = Ldv.getSelection();
                    var LselectionStart = Lsel.focusNode.nodeValue ? Lsel.focusNode.substringData(0, Lsel.focusOffset)._kmwLength() : 0; // I3319
                    if (!Lsel.isCollapsed) {
                        Lsel.deleteFromDocument(); // I2134, I2192
                    }
                    //KeymanWeb._Debug('KO: focusOffset='+Lsel.focusOffset+', dn='+dn+', s='+s+' focusNode.type='+Lsel.focusNode.nodeType+', focusNode.parentNode.tagName='+(Lsel.focusNode.parentNode?Lsel.focusNode.parentNode.tagName:'NULL') );
                    var Lrange = Lsel.getRangeAt(0);
                    if (dn > 0) {
                        Lrange.setStart(Lsel.focusNode, Lsel.focusOffset - Lsel.focusNode.nodeValue.substr(0, Lsel.focusOffset)._kmwSubstr(-dn).length); // I3319
                        Lrange.deleteContents();
                    }
                    //KeymanWeb._Debug('KO: focusOffset='+Lsel.focusOffset+', dn='+dn+', s='+s+' focusNode.type='+Lsel.focusNode.nodeType+', focusNode.parentNode.tagName='+(Lsel.focusNode.parentNode?Lsel.focusNode.parentNode.tagName:'NULL') );
                    if (s._kmwLength() > 0) { // I2132 - exception if s.length > 0, I3319
                        if (Lsel.focusNode.nodeType == 3) {
                            // I2134, I2192
                            // Already in a text node
                            //KeymanWeb._Debug('KO: Already in a text node, adding "'+s+'": '+Lsel.focusOffset + '-> '+Lsel.toString());
                            var LfocusOffset = Lsel.focusOffset;
                            //KeymanWeb._Debug('KO: node.text="'+Lsel.focusNode.data+'", node.length='+Lsel.focusNode.length);
                            Lsel.focusNode.insertData(Lsel.focusOffset, s);
                            try {
                                Lsel.extend(Lsel.focusNode, LfocusOffset + s.length);
                            }
                            catch (e) {
                                // Chrome (through 4.0 at least) throws an exception because it has not synchronised its content with the selection.  scrollIntoView synchronises the content for selection
                                Lsel.focusNode.parentNode.scrollIntoView();
                                Lsel.extend(Lsel.focusNode, LfocusOffset + s.length);
                            }
                        }
                        else {
                            // Create a new text node - empty control
                            //KeymanWeb._Debug('KO: Creating a new text node for "'+s+'"');
                            var n = Ldoc.createTextNode(s);
                            Lrange.insertNode(n);
                            Lsel.extend(n, s.length);
                        }
                    }
                    if (_IsEditableIframe) {
                        this._CacheCommandsReset(Ldoc, _CacheableCommands, null); // I2457 - support contentEditable elements in mozilla, webkit
                    }
                    Lsel.collapseToEnd();
                    // Adjust deadkey positions 
                    if (dn >= 0) {
                        this._DeadkeyDeleteMatched(); // I3318
                        this._DeadkeyAdjustPos(LselectionStart, -dn + s._kmwLength()); // I3318
                    } // Internet Explorer   (including IE9)   
                }
                else if (Pelem.setSelectionRange) {
                    var LselectionStart, LselectionEnd;
                    if (Pelem._KeymanWebSelectionStart != null) { // changed to allow a value of 0
                        LselectionStart = Pelem._KeymanWebSelectionStart;
                        LselectionEnd = Pelem._KeymanWebSelectionEnd;
                    }
                    else {
                        LselectionStart = Pelem.value._kmwCodeUnitToCodePoint(Pelem.selectionStart); // I3319
                        LselectionEnd = Pelem.value._kmwCodeUnitToCodePoint(Pelem.selectionEnd); // I3319
                    }
                    var LscrollTop, LscrollLeft;
                    if (Pelem.type.toLowerCase() == 'textarea' && typeof (Pelem.scrollTop) != 'undefined') {
                        LscrollTop = Pelem.scrollTop;
                        LscrollLeft = Pelem.scrollLeft;
                    }
                    if (dn < 0) { // Don't delete, leave context alone (dn = -1)
                        Pelem.value = Pelem.value._kmwSubstring(0, LselectionStart) + s + Pelem.value._kmwSubstring(LselectionEnd); //I3319
                        dn = 0;
                    }
                    else if (LselectionStart < dn) {
                        Pelem.value = s + Pelem.value._kmwSubstring(LselectionEnd); //I3319
                    }
                    else {
                        Pelem.value = Pelem.value._kmwSubstring(0, LselectionStart - dn) + s + Pelem.value._kmwSubstring(LselectionEnd); //I3319
                    }
                    // Adjust deadkey positions 
                    if (dn >= 0) {
                        this._DeadkeyDeleteMatched(); // I3318
                        this._DeadkeyAdjustPos(LselectionStart, -dn + s._kmwLength()); // I3318,I3319
                    }
                    if (typeof (LscrollTop) != 'undefined') {
                        Pelem.scrollTop = LscrollTop;
                        Pelem.scrollLeft = LscrollLeft;
                    }
                    var caretPos = LselectionStart - dn + s._kmwLength(); // I3319
                    var caretPosUnits = Pelem.value._kmwCodePointToCodeUnit(caretPos); // I3319
                    Pelem.setSelectionRange(caretPosUnits, caretPosUnits); // I3319
                    Pelem._KeymanWebSelectionStart = null;
                    Pelem._KeymanWebSelectionEnd = null;
                }
                // Refresh element content after change (if needed)
                if (typeof (this.keymanweb.refreshElementContent) == 'function') {
                    this.keymanweb.refreshElementContent(Pelem);
                }
                if ((dn >= 0 || s) && Pelem == keyman.DOMEventHandlers.states.activeElement) {
                    // Record that we've made an edit.
                    keyman.DOMEventHandlers.states.changed = true;
                }
            };
            /**
             * Function     deadkeyOutput KDO
             * Scope        Public
             * @param       {number}      Pdn     no of character to overwrite (delete)
             * @param       {Object}      Pelem   element to output to
             * @param       {number}      Pd      deadkey id
             * Description  Record a deadkey at current cursor position, deleting Pdn characters first
             */
            KeyboardInterface.prototype.deadkeyOutput = function (Pdn, Pelem, Pd) {
                this.resetContextCache();
                if (Pdn >= 0) {
                    this.output(Pdn, Pelem, ""); //I3318 corrected to >=
                }
                var Lc = new Deadkey(this._SelPos(Pelem), Pd);
                // Aim to put the newest deadkeys first.
                this._DeadKeys = [Lc].concat(this._DeadKeys);
                //    _DebugDeadKeys(Pelem, 'KDeadKeyOutput: dn='+Pdn+'; deadKey='+Pd);
            };
            /**
             * KIFS compares the content of a system store with a string value
             *
             * @param       {number}      systemId    ID of the system store to test (only TSS_LAYER currently supported)
             * @param       {string}      strValue    String value to compare to
             * @param       {Object}      Pelem       Currently active element (may be needed by future tests)
             * @return      {boolean}                 True if the test succeeds
             */
            KeyboardInterface.prototype.ifStore = function (systemId, strValue, Pelem) {
                var result = true;
                if (systemId == this.TSS_LAYER) {
                    result = (this.keymanweb.osk.layerId === strValue);
                }
                else if (systemId == this.TSS_PLATFORM) {
                    var i, constraint, constraints = strValue.split(' ');
                    for (i = 0; i < constraints.length; i++) {
                        constraint = constraints[i].toLowerCase();
                        switch (constraint) {
                            case 'touch':
                            case 'hardware':
                                if (this.keymanweb.util.activeDevice.touchable != (constraint == 'touch')) {
                                    result = false;
                                }
                                break;
                            case 'macos':
                            case 'mac':
                                constraint = 'macosx';
                            // fall through
                            case 'macosx':
                            case 'windows':
                            case 'android':
                            case 'ios':
                            case 'linux':
                                if (this.keymanweb.util.activeDevice.OS.toLowerCase() != constraint) {
                                    result = false;
                                }
                                break;
                            case 'tablet':
                            case 'phone':
                            case 'desktop':
                                if (this.keymanweb.util.device.formFactor != constraint) {
                                    result = false;
                                }
                                break;
                            case 'web':
                                if (this.keymanweb.util.device.browser == 'native') {
                                    result = false; // web matches anything other than 'native'
                                }
                                break;
                            case 'native':
                            // This will return true for embedded KeymanWeb
                            case 'ie':
                            case 'chrome':
                            case 'firefox':
                            case 'safari':
                            case 'edge':
                            case 'opera':
                                if (this.keymanweb.util.device.browser != constraint) {
                                    result = false;
                                }
                                break;
                            default:
                                result = false;
                        }
                    }
                }
                return result; //Moved from previous line, now supports layer selection, Build 350 
            };
            /**
             * KSETS sets the value of a system store to a string
             *
             * @param       {number}      systemId    ID of the system store to set (only TSS_LAYER currently supported)
             * @param       {string}      strValue    String to set as the system store content
             * @param       {Object}      Pelem       Currently active element (may be needed in future tests)
             * @return      {boolean}                 True if command succeeds
             *                                        (i.e. for TSS_LAYER, if the layer is successfully selected)
             */
            KeyboardInterface.prototype.setStore = function (systemId, strValue, Pelem) {
                this.resetContextCache();
                if (systemId == this.TSS_LAYER) {
                    return this.keymanweb.osk.showLayer(strValue); //Buld 350, osk reference now OK, so should work
                }
                else {
                    return false;
                }
            };
            /**
             * Load an option store value from a cookie or default value
             *
             * @param       {string}      kbdName     keyboard internal name
             * @param       {string}      storeName   store (option) name, embedded in cookie name
             * @param       {string}      dfltValue   default value
             * @return      {string}                  current or default option value
             */
            KeyboardInterface.prototype.loadStore = function (kbdName, storeName, dfltValue) {
                this.resetContextCache();
                var cName = 'KeymanWeb_' + kbdName + '_Option_' + storeName, cValue = this.keymanweb.util.loadCookie(cName);
                if (typeof cValue[storeName] != 'undefined') {
                    return decodeURIComponent(cValue[storeName]);
                }
                else {
                    return dfltValue;
                }
            };
            /**
             * Save an option store value to a cookie
             *
             * @param       {string}      storeName   store (option) name, embedded in cookie name
             * @param       {string}      optValue    option value to save
             * @return      {boolean}                 true if save successful
             */
            KeyboardInterface.prototype.saveStore = function (storeName, optValue) {
                this.resetContextCache();
                var kbd = this.keymanweb.keyboardManager.activeKeyboard;
                if (!kbd || typeof kbd['KI'] == 'undefined' || kbd['KI'] == '') {
                    return false;
                }
                var cName = 'KeymanWeb_' + kbd['KI'] + '_Option_' + storeName, cValue = encodeURIComponent(optValue);
                this.keymanweb.util.saveCookie(cName, cValue);
                return true;
            };
            KeyboardInterface.prototype.resetContextCache = function () {
                this.cachedContext.reset();
                this.cachedContextEx.reset();
            };
            // I3318 - deadkey changes START
            /**
             * Function     _DeadkeyResetMatched
             * Scope        Private
             * Description  Clear all matched deadkey flags
             */
            KeyboardInterface.prototype._DeadkeyResetMatched = function () {
                for (var _i = 0, _a = this._DeadKeys; _i < _a.length; _i++) {
                    var dk = _a[_i];
                    dk.reset();
                }
            };
            /**
             * Function     _DeadkeyDeleteMatched
             * Scope        Private
             * Description  Delete matched deadkeys from context
             */
            KeyboardInterface.prototype._DeadkeyDeleteMatched = function () {
                var _Dk = this._DeadKeys;
                for (var Li = 0; Li < _Dk.length; Li++) {
                    if (_Dk[Li].matched) {
                        _Dk.splice(Li--, 1); // Don't forget to decrement!
                    }
                }
            };
            /**
             * Function     _DeadkeyAdjustPos
             * Scope        Private
             * @param       {number}      Lstart      start position in context
             * @param       {number}      Ldelta      characters to adjust by
             * Description  Adjust saved positions of deadkeys in context
             */
            KeyboardInterface.prototype._DeadkeyAdjustPos = function (Lstart, Ldelta) {
                for (var _i = 0, _a = this._DeadKeys; _i < _a.length; _i++) {
                    var dk = _a[_i];
                    if (dk.p > Lstart) {
                        dk.p += Ldelta;
                    }
                }
            };
            // I3318 - deadkey changes END
            KeyboardInterface.prototype.doInputEvent = function (_target) {
                var event;
                // TypeScript doesn't yet recognize InputEvent as a type!
                if (typeof window['InputEvent'] == 'function') {
                    event = new window['InputEvent']('input', { "bubbles": true, "cancelable": false });
                } // No else - there is no supported version in some browsers.
                // Ensure that touch-aliased elements fire as if from the aliased element.
                if (_target['base'] && _target['base']['kmw_ip']) {
                    _target = _target['base'];
                }
                if (_target && event) {
                    _target.dispatchEvent(event);
                }
            };
            KeyboardInterface.prototype.defaultBackspace = function (Pelem) {
                if (!Pelem) {
                    Pelem = this.keymanweb.domManager.getLastActiveElement();
                }
                this.output(1, Pelem, "");
                this.doInputEvent(Pelem);
            };
            /**
             * Function     processKeystroke
             * Scope        Private
             * @param       {Object}        device      The device object properties to be utilized for this keystroke.
             * @param       {Object}        element     The page element receiving input
             * @param       {Object}        keystroke   The input keystroke (with its properties) to be mapped by the keyboard.
             * Description  Encapsulates calls to keyboard input processing.
             * @returns     {number}        0 if no match is made, otherwise 1.
             */
            KeyboardInterface.prototype.processKeystroke = function (device, element, keystroke) {
                // Clear internal state tracking data from prior keystrokes.
                this.keymanweb._CachedSelectionStart = null; // I3319     
                this._DeadkeyResetMatched(); // I3318    
                this.resetContextCache();
                // Ensure the settings are in place so that KIFS/ifState activates and deactivates
                // the appropriate rule(s) for the modeled device.
                this.keymanweb.util.activeDevice = device;
                // Calls the start-group of the active keyboard.
                var matched = this.keymanweb.keyboardManager.activeKeyboard['gs'](element, keystroke);
                if (matched) {
                    this.doInputEvent(element);
                }
                return matched;
            };
            /**
             * Legacy entry points (non-standard names)- included only to allow existing IME keyboards to continue to be used
             */
            KeyboardInterface.prototype['getLastActiveElement'] = function () {
                return this.keymanweb.domManager.getLastActiveElement();
            };
            KeyboardInterface.prototype['focusLastActiveElement'] = function () {
                this.keymanweb.domManager.focusLastActiveElement();
            };
            //The following entry points are defined but should not normally be used in a keyboard, as OSK display is no longer determined by the keyboard
            KeyboardInterface.prototype['hideHelp'] = function () {
                this.keymanweb.osk._Hide(true);
            };
            KeyboardInterface.prototype['showHelp'] = function (Px, Py) {
                this.keymanweb.osk._Show(Px, Py);
            };
            KeyboardInterface.prototype['showPinnedHelp'] = function () {
                this.keymanweb.osk.userPositioned = true;
                this.keymanweb.osk._Show(-1, -1);
            };
            KeyboardInterface.prototype.resetContext = function () {
                this.keymanweb.osk.layerId = 'default';
                this.clearDeadkeys();
                this.resetContextCache();
                this.resetVKShift();
                this.keymanweb.osk._Show();
            };
            ;
            KeyboardInterface.prototype.setNumericLayer = function () {
                var i;
                for (i = 0; i < this.keymanweb.osk.layers.length; i++) {
                    if (this.keymanweb.osk.layers[i].id == 'numeric') {
                        this.keymanweb.osk.layerId = 'numeric';
                        this.keymanweb.osk._Show();
                    }
                }
            };
            ;
            /**
             * Function     _SelPos
             * Scope        Private
             * @param       {Object}  Pelem   Element
             * @return      {number}          Selection start
             * Description  Get start of selection (with supplementary plane modifications)
             */
            KeyboardInterface.prototype._SelPos = function (Pelem) {
                var Ldoc, Ldv, isMSIE = (keyman.Device._GetIEVersion() < 999); // I3363 (Build 301)
                if (this.keymanweb.isPositionSynthesized())
                    return this.keymanweb.touchAliasing.getTextCaret(Pelem);
                if (Pelem._KeymanWebSelectionStart) {
                    return Pelem._KeymanWebSelectionStart;
                }
                else if ((Ldoc = Pelem.ownerDocument) && (Ldv = Ldoc.defaultView)) {
                    // Mozilla, IE9 
                    if (Pelem instanceof Ldv.HTMLInputElement || Pelem instanceof Ldv.HTMLTextAreaElement) {
                        if (Pelem.setSelectionRange) {
                            return Pelem.value.substr(0, Pelem.selectionStart)._kmwLength();
                        } // contentEditable elements, Mozilla midas
                    }
                    else if (Ldv.getSelection && Pelem.ownerDocument.designMode.toLowerCase() == 'on') {
                        var Lsel = Ldv.getSelection();
                        if (Lsel.focusNode.nodeType == 3)
                            return Lsel.focusNode.substringData(0, Lsel.focusOffset)._kmwLength();
                    }
                }
                return 0;
            };
            /**
             * Reset OSK shift states when entering or exiting the active element
             **/
            KeyboardInterface.prototype.resetVKShift = function () {
                if (!this.keymanweb.uiManager.isActivating) {
                    if (this.keymanweb.osk._UpdateVKShift) {
                        this.keymanweb.osk._UpdateVKShift(null, 15, 0); //this should be enabled !!!!! TODO
                    }
                }
            };
            return KeyboardInterface;
        }());
        keyman.KeyboardInterface = KeyboardInterface;
    })(keyman = com.keyman || (com.keyman = {}));
})(com || (com = {}));
/// <reference path="kmwbase.ts" />
var com;
(function (com) {
    var keyman;
    (function (keyman) {
        var CloudRequestEntry = /** @class */ (function () {
            function CloudRequestEntry(id, language) {
                this.id = id;
                this.language = language;
            }
            CloudRequestEntry.prototype.toString = function () {
                var kbid = this.id;
                var lgid = '';
                var kvid = '';
                if (this.language) {
                    kbid = kbid + '@' + this.language;
                    if (this.version) {
                        kbid = kbid + '@' + this.version;
                    }
                }
                else {
                    if (this.version) {
                        kbid = kbid + '@@' + this.version;
                    }
                }
                //TODO: add specifier validation... 
                return kbid;
            };
            return CloudRequestEntry;
        }());
        var KeyboardFont = /** @class */ (function () {
            function KeyboardFont(fontObj, fontPath) {
                this['family'] = fontObj['family'];
                this['files'] = fontObj['source'];
                this['path'] = fontPath;
            }
            return KeyboardFont;
        }());
        var KeyboardStub = /** @class */ (function () {
            function KeyboardStub(id, langCode) {
                this['KI'] = 'Keyboard_' + id;
                this['KLC'] = langCode;
            }
            return KeyboardStub;
        }());
        keyman.KeyboardStub = KeyboardStub;
        var KeyboardTag = /** @class */ (function () {
            function KeyboardTag() {
                this.stores = {};
            }
            return KeyboardTag;
        }());
        keyman.KeyboardTag = KeyboardTag;
        var KeyboardManager = /** @class */ (function () {
            function KeyboardManager(kmw) {
                this.activeStub = null;
                this.keyboardStubs = [];
                this.deferredStubs = []; // The list of user-provided keyboard stub registration objects.
                this.deferredKRS = []; // Array of pending keyboard stubs from KRS, to register after initialization
                this.deferredKR = []; // Array of pending keyboards, to be installed at end of initialization
                // The following was not actually utilized within KeymanWeb; I think it's handled via different logic.  
                // See setDefaultKeyboard() below.
                this.dfltStub = null; // First keyboard stub loaded - default for touch-screen devices, ignored on desktops
                this.keyboards = [];
                this.languageList = null; // List of keyboard languages available for KeymanCloud
                this.languagesPending = []; // Array of languages waiting to be registered
                this.linkedScripts = [];
                /**
                 * Get an associative array of keyboard identification strings
                 *   This was defined as an array, so is kept that way, but
                 *   Javascript treats it as an object anyway
                 *
                 * @param       {Object}    Lkbd       Keyboard object
                 * @return      {Object}               Copy of keyboard identification strings
                 *
                 */
                this._GetKeyboardDetail = function (Lkbd) {
                    var Lr = {};
                    Lr['Name'] = Lkbd['KN'];
                    Lr['InternalName'] = Lkbd['KI'];
                    Lr['LanguageName'] = Lkbd['KL']; // I1300 - Add support for language names
                    Lr['LanguageCode'] = Lkbd['KLC']; // I1702 - Add support for language codes, region names, region codes, country names and country codes
                    Lr['RegionName'] = Lkbd['KR'];
                    Lr['RegionCode'] = Lkbd['KRC'];
                    Lr['CountryName'] = Lkbd['KC'];
                    Lr['CountryCode'] = Lkbd['KCC'];
                    Lr['KeyboardID'] = Lkbd['KD'];
                    Lr['Font'] = Lkbd['KFont'];
                    Lr['OskFont'] = Lkbd['KOskFont'];
                    return Lr;
                };
                /**
                 * Function     _NotifyKeyboard
                 * Scope        Private
                 * @param       {number}    _PCommand     event code (16,17,18) or 0
                 * @param       {Object}    _PTarget      target element
                 * @param       {number}    _PData        1 or 0
                 * Description  Notifies keyboard of keystroke or other event
                 */
                this.notifyKeyboard = function (_PCommand, _PTarget, _PData) {
                    var activeKeyboard = this.activeKeyboard;
                    if (activeKeyboard != null && typeof (activeKeyboard['KNS']) == 'function') {
                        activeKeyboard['KNS'](_PCommand, _PTarget, _PData);
                    }
                };
                this.keymanweb = kmw;
            }
            KeyboardManager.prototype.getActiveKeyboardName = function () {
                return this.activeKeyboard ? this.activeKeyboard['KI'] : '';
            };
            KeyboardManager.prototype.getActiveKeyboardTag = function () {
                return this.activeKeyboard ? this.activeKeyboard['_kmw'] : null;
            };
            KeyboardManager.prototype.getActiveLanguage = function () {
                if (this.activeStub == null) {
                    return '';
                }
                else {
                    return this.activeStub['KLC'];
                }
            };
            /**
             * Get array of available keyboard stubs
             *
             * @return   {Array}     Array of available keyboards
             *
             */
            KeyboardManager.prototype.getDetailedKeyboards = function () {
                var Lr = [], Ln, Lstub, Lrn;
                for (Ln = 0; Ln < this.keyboardStubs.length; Ln++) // I1511 - array prototype extended
                 {
                    Lstub = this.keyboardStubs[Ln];
                    Lrn = this._GetKeyboardDetail(Lstub); // I2078 - Full keyboard detail
                    Lr = this.keymanweb._push(Lr, Lrn); // TODO:  Resolve without need for the cast.
                }
                return Lr;
            };
            KeyboardManager.prototype.registerDeferredStubs = function () {
                this.addKeyboardArray(this.deferredStubs);
                // KRS stubs (legacy format registration)    
                for (var j = 0; j < this.deferredKRS.length; j++) {
                    this._registerStub(this.deferredKRS[j]);
                }
            };
            KeyboardManager.prototype.registerDeferredKeyboards = function () {
                for (var j = 0; j < this.deferredKR.length; j++) {
                    this._registerKeyboard(this.deferredKR[j]);
                }
            };
            /**
             * Register a fully specified keyboard (add meta-data for each language) immediately
             *
             * @param  {Object}  arg
             * @returns {boolean}
             **/
            KeyboardManager.prototype.addStub = function (arg) {
                if (typeof (arg['id']) != 'string') {
                    return false;
                }
                if (typeof (arg['language']) != "undefined") {
                    console.warn("The 'language' property for keyboard stubs has been deprecated.  Please use the 'languages' property instead.");
                    arg['languages'] = arg['language'];
                }
                if (typeof (arg['languages']) == 'undefined') {
                    return false;
                }
                // Default the keyboard name to its id, capitalized
                if (typeof (arg['name']) != 'string') {
                    arg['name'] = arg['id'].replace('_', ' ');
                    arg['name'] = arg['name'].substr(0, 1).toUpperCase() + arg['name'].substr(1);
                }
                var lgArg = arg['languages'];
                var lgList = [], i, lg;
                if (typeof (lgArg.length) == 'undefined') {
                    lgList[0] = lgArg;
                }
                else {
                    lgList = lgArg;
                }
                var localOptions = {
                    'keyboardBaseUri': this.keymanweb.options['keyboards'],
                    'fontBaseUri': this.keymanweb.options['fonts']
                };
                // Add a stub for each correctly specified language
                for (i = 0; i < lgList.length; i++) {
                    this.mergeStub(arg, lgList[i], localOptions);
                }
                return true;
            };
            /**
             *  Create or update a keyboard meta-data 'stub' during keyboard registration
             *
             *  Cross-reference with https://help.keyman.com/developer/engine/web/11.0/reference/core/addKeyboards.
             *
             *  @param  {Object}  kp  (partial) keyboard meta-data object (`spec` object)
             *  @param  {Object}  lp  language object (`spec.languages` object)
             *  @param  {Object}  options   KeymanCloud callback options
             **/
            KeyboardManager.prototype.mergeStub = function (kp, lp, options) {
                var sp = this.findStub(kp['id'], lp['id']);
                var isNew = false;
                if (sp == null) {
                    sp = new KeyboardStub(kp['id'], lp['id']);
                    this.keyboardStubs.push(sp);
                    isNew = true;
                }
                // Accept region as number (from Cloud server), code, or name
                var region = lp['region'], rIndex = 0;
                if (typeof (region) == 'number') {
                    if (region < 1 || region > 9) {
                        rIndex = 0;
                    }
                    else {
                        rIndex = region - 1;
                    }
                }
                else if (typeof (region) == 'string') {
                    var list = (region.length == 2 ? KeyboardManager.regionCodes : KeyboardManager.regions);
                    for (var i = 0; i < list.length; i++) {
                        if (region.toLowerCase() == list[i].toLowerCase()) {
                            rIndex = i;
                            break;
                        }
                    }
                }
                var rx;
                sp['KL'] = (typeof sp['KL'] === 'undefined') ? lp['name'] : sp['KL'];
                sp['KR'] = (typeof sp['KR'] === 'undefined') ? KeyboardManager.regions[rIndex] : sp['KR'];
                sp['KRC'] = (typeof sp['KRC'] === 'undefined') ? KeyboardManager.regionCodes[rIndex] : sp['KRC'];
                sp['KN'] = (typeof sp['KN'] === 'undefined') ? kp['name'] : sp['KN'];
                if (typeof (sp['KF']) == 'undefined') {
                    rx = RegExp('^(([\\.]/)|([\\.][\\.]/)|(/))|(:)');
                    sp['KF'] = kp['filename'];
                    if (!rx.test(sp['KF'])) {
                        sp['KF'] = options['keyboardBaseUri'] + sp['KF'];
                    }
                }
                // Font path defined by cloud entry
                var fontPath = options['fontBaseUri'];
                // or overridden locally, in page source
                if (this.keymanweb.options['fonts'] != '') {
                    fontPath = this.keymanweb.options['fonts'];
                    rx = new RegExp('^https?\\:');
                    if (!rx.test(fontPath)) {
                        if (fontPath.substr(0, 2) == '//') {
                            fontPath = this.keymanweb.protocol + fontPath;
                        }
                        else if (fontPath.substr(0, 1) == '/') {
                            fontPath = this.keymanweb.rootPath + fontPath.substr(1);
                        }
                        else {
                            fontPath = this.keymanweb.rootPath + fontPath;
                        }
                    }
                }
                else {
                    this.keymanweb.options.fonts = fontPath;
                }
                // Add font specifiers where necessary and not overridden by user
                if (typeof (lp['font']) != 'undefined') {
                    sp['KFont'] = (typeof sp['KFont'] === 'undefined') ? new KeyboardFont(lp['font'], fontPath) : sp['KFont'];
                }
                // Fixed OSK font issue Github #7 (9/1/2015)
                if (typeof (lp['oskFont']) != 'undefined') {
                    sp['KOskFont'] = (typeof sp['KOskFont'] === 'undefined') ? new KeyboardFont(lp['oskFont'], fontPath) : sp['KOskFont'];
                }
                // Update the UI 
                this.doKeyboardRegistered(sp['KI'], sp['KL'], sp['KN'], sp['KLC'], sp['KP']);
                // If we have no activeStub because there were no stubs, set the new keyboard as active.
                // Do not trigger on merges.
                if (!this.activeStub && isNew && this.keyboardStubs.length == 1) {
                    // #676: We call _SetActiveKeyboard so we can avoid overwriting 
                    // cookies that determine our active keyboard at page load time
                    this.doBeforeKeyboardChange(sp['KI'], sp['KLC']);
                    this._SetActiveKeyboard(sp['KI'], sp['KLC'], false);
                    this.doKeyboardChange(sp['KI'], sp['KLC']);
                }
            };
            /**
             *  Find a keyboard stub by id in the registered keyboards list
             *
             *  @param  {string}  kid   internal keyboard id (without 'Keyboard_' prefix)
             *  @param  {string}  lgid  language code
             *
             **/
            KeyboardManager.prototype.findStub = function (kid, lgid) {
                var i;
                for (i = 0; i < this.keyboardStubs.length; i++) {
                    if ((this.keyboardStubs[i]['KI'] == 'Keyboard_' + kid) && (this.keyboardStubs[i]['KLC'] == lgid)) {
                        return this.keyboardStubs[i];
                    }
                }
                return null;
            };
            // Called on the embedded path at the end of its initialization.
            KeyboardManager.prototype.setDefaultKeyboard = function () {
                if (this.keyboardStubs.length > 0) {
                    // Select the first stub as our active keyboard.
                    this._SetActiveKeyboard(this.keyboardStubs[0]['KI'], this.keyboardStubs[0]['KLC']);
                    return true;
                }
                else {
                    return false;
                }
            };
            /**
             * Allow to change active keyboard by (internal) keyboard name
             *
             * @param       {string}    PInternalName   Internal name
             * @param       {string}    PLgCode         Language code
             */
            KeyboardManager.prototype.setActiveKeyboard = function (PInternalName, PLgCode) {
                //TODO: This does not make sense: the callbacks should be in _SetActiveKeyboard, not here,
                //      since this is always called FROM the UI, which should not need notification.
                //      If UI callbacks are needed at all, they should be within _SetActiveKeyboard 
                // Skip on embedded which namespaces packageID::Keyboard_keyboardID
                if (!this.keymanweb.isEmbedded && PInternalName && PInternalName.indexOf("Keyboard_") != 0) {
                    PInternalName = "Keyboard_" + PInternalName;
                }
                this.doBeforeKeyboardChange(PInternalName, PLgCode);
                var p = this._SetActiveKeyboard(PInternalName, PLgCode, true);
                if (this.keymanweb.domManager.getLastActiveElement() != null) {
                    this.keymanweb.domManager.focusLastActiveElement(); // TODO:  Resolve without need for the cast.
                }
                // If we ever allow PLgCode to be set by default, we can auto-detect the language code
                // after the _SetActiveKeyboard call.
                // if(!PLgCode && (<KeymanBase>keymanweb).keyboardManager.activeStub) {
                //   PLgCode = (<KeymanBase>keymanweb).keyboardManager.activeStub['KLC'];
                // }
                this.doKeyboardChange(PInternalName, PLgCode);
                return p;
            };
            /**
             * Change active keyboard to keyboard selected by (internal) name and language code
             *
             *  Test if selected keyboard already loaded, and simply update active stub if so.
             *  Otherwise, insert a script to download and insert the keyboard from the repository
             *  or user-indicated file location.
             *
             * Note that the test-case oriented 'recorder' stubs this method to provide active
             * keyboard stub information.  If changing this function, please ensure the recorder is
             * not affected.
             *
             * @param       {string}    PInternalName
             * @param       {string=}    PLgCode
             * @param       {boolean=}   saveCookie
             */
            KeyboardManager.prototype._SetActiveKeyboard = function (PInternalName, PLgCode, saveCookie) {
                var n, Ln;
                var util = this.keymanweb.util;
                var osk = this.keymanweb.osk;
                // Set default language code
                if (arguments.length < 2 || (!PLgCode)) {
                    PLgCode = '---';
                }
                // Check that the saved keyboard is currently registered
                for (n = 0; n < this.keyboardStubs.length; n++) {
                    if (PInternalName == this.keyboardStubs[n]['KI']) {
                        if (PLgCode == this.keyboardStubs[n]['KLC'] || PLgCode == '---')
                            break;
                    }
                }
                // Mobile device addition: force selection of the first keyboard if none set
                if (util.device.touchable && (PInternalName == '' || PInternalName == null || n >= this.keyboardStubs.length)) {
                    if (this.keyboardStubs.length != 0) {
                        PInternalName = this.keyboardStubs[0]['KI'];
                        PLgCode = this.keyboardStubs[0]['KLC'];
                    }
                }
                // Save name of keyboard (with language code) as a cookie
                if (arguments.length > 2 && saveCookie) {
                    this.saveCurrentKeyboard(PInternalName, PLgCode);
                }
                // Check if requested keyboard and stub are currently active
                if (this.activeStub && this.activeKeyboard && this.activeKeyboard['KI'] == PInternalName
                    && this.activeStub['KI'] == PInternalName //this part of test should not be necessary, but keep anyway
                    && this.activeStub['KLC'] == PLgCode && !this.keymanweb.mustReloadKeyboard)
                    return Promise.resolve();
                // Check if current keyboard matches requested keyboard, but not stub
                if (this.activeKeyboard && (this.activeKeyboard['KI'] == PInternalName)) {
                    // If so, simply update the active stub
                    for (Ln = 0; Ln < this.keyboardStubs.length; Ln++) {
                        if ((this.keyboardStubs[Ln]['KI'] == PInternalName)
                            && (this.keyboardStubs[Ln]['KLC'] == PLgCode)) {
                            this.activeStub = this.keyboardStubs[Ln];
                            // Append a stylesheet for this keyboard for keyboard specific styles 
                            // or if needed to specify an embedded font
                            osk.appendStyleSheet();
                            // Re-initializate OSK before returning if required
                            if (this.keymanweb.mustReloadKeyboard) {
                                osk._Load();
                            }
                            return Promise.resolve();
                        }
                    }
                }
                this.activeKeyboard = null;
                this.activeStub = null;
                // Hide OSK and do not update keyboard list if using internal keyboard (desktops)
                if (PInternalName == '') {
                    osk._Hide(false);
                    if (!this.keymanweb.isEmbedded) {
                        util.wait(false);
                    }
                    return Promise.resolve();
                }
                // Determine if the keyboard was previously loaded but is not active and use the prior load if so.
                for (Ln = 0; Ln < this.keyboards.length; Ln++) { // I1511 - array prototype extended
                    if (this.keyboards[Ln]['KI'] == PInternalName) {
                        this.activeKeyboard = this.keyboards[Ln];
                        this.keymanweb.domManager._SetTargDir(this.keymanweb.domManager.getLastActiveElement()); // I2077 - LTR/RTL timing
                        // and update the active stub
                        for (var Ls = 0; Ls < this.keyboardStubs.length; Ls++) {
                            if ((this.keyboardStubs[Ls]['KI'] == PInternalName) &&
                                (this.keyboardStubs[Ls]['KLC'] == PLgCode || PLgCode == '---')) {
                                this.activeStub = this.keyboardStubs[Ls];
                                break;
                            }
                        }
                        break;
                    }
                }
                if (this.activeKeyboard == null) {
                    for (Ln = 0; Ln < this.keyboardStubs.length; Ln++) { // I1511 - array prototype extended
                        if ((this.keyboardStubs[Ln]['KI'] == PInternalName)
                            && ((this.keyboardStubs[Ln]['KLC'] == PLgCode) || (PLgCode == '---'))) {
                            // Force OSK display for CJK keyboards (keyboards using a pick list)
                            if (this.isCJK(this.keyboardStubs[Ln]) || util.device.touchable) {
                                osk._Enabled = 1;
                            }
                            // Create a script to load from the server - when it finishes loading, it will register itself, 
                            //  detect that it is active, and focus as appropriate. The second test is needed to allow recovery from a failed script load
                            // Ensure we're not already loading the keyboard.
                            if (!this.keyboardStubs[Ln].asyncLoader) {
                                // Always (temporarily) hide the OSK when loading a new keyboard, to ensure that a failure to load doesn't leave the current OSK displayed
                                if (osk.ready) {
                                    osk._Hide(false);
                                }
                                var loadingStub = this.keyboardStubs[Ln];
                                // Tag the stub so that we don't double-load the keyboard!
                                loadingStub.asyncLoader = {};
                                var kbdName = loadingStub['KN'];
                                var lngName = loadingStub['KL'];
                                kbdName = kbdName.replace(/\s*keyboard\s*/i, '');
                                // Setup our default error-messaging callback if it should be implemented.
                                loadingStub.asyncLoader.callback = function (altString, msgType) {
                                    var msg = altString || 'Sorry, the ' + kbdName + ' keyboard for ' + lngName + ' is not currently available.';
                                    // Thanks, Closure errors.  
                                    if (!this.keymanweb.isEmbedded) {
                                        util.wait(false);
                                        util.alert(altString || msg, function () {
                                            this.keymanweb['setActiveKeyboard'](''); // The API call!
                                        }.bind(this));
                                    }
                                    switch (msgType) { // in case we extend this later.
                                        case 'err':
                                            console.error(msg);
                                            break;
                                        case 'warn':
                                        default:
                                            console.warn(msg);
                                            break;
                                    }
                                    if (Ln > 0) {
                                        var Ps = this.keyboardStubs[0];
                                        this._SetActiveKeyboard(Ps['KI'], Ps['KLC'], true);
                                    }
                                }.bind(this);
                                loadingStub.asyncLoader.timer = window.setTimeout(loadingStub.asyncLoader.callback, 10000);
                                //Display the loading delay bar (Note: only append 'keyboard' if not included in name.) 
                                if (!this.keymanweb.isEmbedded) {
                                    util.wait('Installing keyboard<br/>' + kbdName);
                                }
                                // Installing the script immediately does not work reliably if two keyboards are
                                // loaded in succession if there is any delay in downloading the script.
                                // It works much more reliably if deferred (KMEW-101, build 356)
                                // The effect of a delay can also be tested, for example, by setting the timeout to 5000
                                var manager = this;
                                loadingStub.asyncLoader.promise = new Promise(function (resolve, reject) {
                                    window.setTimeout(function () {
                                        manager.installKeyboard(resolve, reject, loadingStub);
                                    }, 0);
                                });
                            }
                            this.activeStub = this.keyboardStubs[Ln];
                            return this.keyboardStubs[Ln].asyncLoader.promise;
                        }
                    }
                    this.keymanweb.domManager._SetTargDir(this.keymanweb.domManager.getLastActiveElement()); // I2077 - LTR/RTL timing
                }
                var Pk = this.activeKeyboard; // I3319
                if (Pk !== null) // I3363 (Build 301)
                    String.kmwEnableSupplementaryPlane(Pk && ((Pk['KS'] && (Pk['KS'] == 1)) || (Pk['KN'] == 'Hieroglyphic'))); // I3319
                // Initialize the OSK (provided that the base code has been loaded)
                osk._Load();
                return Promise.resolve();
            };
            /**
             * Install a keyboard script that has been downloaded from a keyboard server
             * Operates as the core of a Promise, hence the 'resolve' and 'reject' parameters.
             *
             *  @param  {Object}  kbdStub   keyboard stub to be loaded.
             *
             **/
            KeyboardManager.prototype.installKeyboard = function (resolve, reject, kbdStub) {
                var util = this.keymanweb.util;
                var osk = this.keymanweb.osk;
                var Lscript = util._CreateElement('script');
                Lscript.charset = "UTF-8"; // KMEW-89
                Lscript.type = 'text/javascript';
                // Preserve any namespaced IDs by use of the script's id tag attribute!
                if (this.keymanweb.isEmbedded) {
                    Lscript.id = kbdStub['KI'];
                }
                var kbdFile = kbdStub['KF'];
                var kbdLang = kbdStub['KL'];
                var kbdName = kbdStub['KN'];
                var manager = this;
                // Add a handler for cases where the new <script> block fails to load.
                Lscript.addEventListener('error', function () {
                    if (kbdStub.asyncLoader.timer !== null) {
                        // Clear the timeout timer.
                        window.clearTimeout(kbdStub.asyncLoader.timer);
                        kbdStub.asyncLoader.timer = null;
                    }
                    // We already know the load has failed... why wait?
                    kbdStub.asyncLoader.callback('Cannot find the ' + kbdName + ' keyboard for ' + kbdLang + '.', 'warn');
                    kbdStub.asyncLoader = null;
                    reject();
                }, false);
                // The load event will activate a newly-loaded keyboard if successful and report an error if it is not.
                Lscript.addEventListener('load', function () {
                    if (kbdStub.asyncLoader.timer !== null) {
                        // Clear the timeout timer.
                        window.clearTimeout(kbdStub.asyncLoader.timer);
                        kbdStub.asyncLoader.timer = null;
                    }
                    // To determine if the load was successful, we'll need to check the keyboard array for our desired keyboard.
                    // Test if keyboard already loaded
                    var kbd = manager.getKeyboardByID(kbdStub['KI']), Li;
                    if (kbd) { // Is cleared upon a successful load.
                        //Activate keyboard, if it's still the active stub.
                        if (kbdStub == manager.activeStub) {
                            manager.doBeforeKeyboardChange(kbd['KI'], kbdStub['KLC']);
                            manager.activeKeyboard = kbd;
                            if (manager.keymanweb.domManager.getLastActiveElement() != null) { // TODO:  Resolve without need for the cast.
                                manager.keymanweb.uiManager.justActivated = true; // TODO:  Resolve without need for the cast.
                                manager.keymanweb.domManager._SetTargDir(manager.keymanweb.domManager.getLastActiveElement());
                            }
                            String.kmwEnableSupplementaryPlane(kbd && ((kbd['KS'] && kbd['KS'] == 1) || kbd['KN'] == 'Hieroglyphic')); // I3319 - SMP extension, I3363 (Build 301)
                            manager.saveCurrentKeyboard(kbd['KI'], kbdStub['KLC']);
                            // Prepare and show the OSK for this keyboard
                            osk._Load();
                        }
                        // Remove the wait message, if defined
                        if (!manager.keymanweb.isEmbedded) {
                            util.wait(false);
                        }
                        kbdStub.asyncLoader = null;
                        resolve();
                        // A handler portion for cases where the new <script> block loads, but fails to process.
                    }
                    else { // Output error messages even when embedded - they're useful when debugging the apps and KMEA/KMEI engines.
                        kbdStub.asyncLoader.callback('Error registering the ' + kbdName + ' keyboard for ' + kbdLang + '.', 'error');
                        kbdStub.asyncLoader = null;
                        reject();
                    }
                }, false);
                // IE likes to instantly start loading the file when assigned to an element, so we do this after the rest
                // of our setup.  This method is not relocated here (yet) b/c it varies based upon 'native' vs 'embedded'.
                Lscript.src = this.keymanweb.getKeyboardPath(kbdFile);
                try {
                    document.body.appendChild(Lscript);
                    this.linkedScripts.push(Lscript);
                }
                catch (ex) {
                    try {
                        document.getElementsByTagName('head')[0].appendChild(Lscript);
                    }
                    catch (ex2) {
                        reject();
                    }
                }
            };
            /* TODO: why not use util.loadCookie and saveCookie?? */
            /**
             * Function     saveCurrentKeyboard
             * Scope        Private
             * @param       {string}    PInternalName       name of keyboard
             * @param       {string}    PLgCode             language code
             * Description Saves current keyboard as a cookie
             */
            KeyboardManager.prototype.saveCurrentKeyboard = function (PInternalName, PLgCode) {
                var s = "current=" + PInternalName + ":" + PLgCode;
                this.keymanweb.util.saveCookie('KeymanWeb_Keyboard', { 'current': PInternalName + ':' + PLgCode });
                // Additionally, make sure we save the (upcoming) per-control keyboard settings.
                // This allows us to ensure the keyboard is set correctly without waiting for focus event
                // triggers - very helpful for automated testing.
                if (!this.keymanweb.isEmbedded) {
                    this.keymanweb.touchAliasing._BlurKeyboardSettings(PInternalName, PLgCode);
                }
            };
            /**
             * Restore the most recently used keyboard, if still available
             */
            KeyboardManager.prototype.restoreCurrentKeyboard = function () {
                var stubs = this.keyboardStubs, i, n = stubs.length;
                // Do nothing if no stubs loaded
                if (stubs.length < 1)
                    return;
                // If no saved keyboard, default to US English, else first loaded stub
                var d = this.getSavedKeyboard();
                var t = d.split(':');
                // Identify the stub with the saved keyboard
                t = d.split(':');
                if (t.length < 2)
                    t[1] = '';
                // This loop is needed to select the correct stub when several apply to a given keyboard
                // TODO: There should be a better way!
                for (i = 0; i < n; i++) {
                    if (stubs[i]['KI'] == t[0] && (stubs[i]['KLC'] == t[1] || t[1] == ''))
                        break;
                }
                // Sets the default stub (as specified with the `getSavedKeyboard` call) as active.
                // if((i < n) || (device.touchable && (this.activeKeyboard == null)))
                if ((i < n) || (this.activeKeyboard == null)) {
                    this._SetActiveKeyboard(t[0], t[1], false);
                    this.keymanweb.globalKeyboard = t[0];
                    this.keymanweb.globalLanguageCode = t[1];
                    this.doKeyboardChange(t[0], t[1]); // And update the UI if necessary
                }
            };
            /**
             * Gets the cookie for the name and language code of the most recently active keyboard
             *
             *  Defaults to US English, but this needs to be user-set in later revision (TODO)
             *
             * @return      {string}          InternalName:LanguageCode
             **/
            KeyboardManager.prototype.getSavedKeyboard = function () {
                var v = this.keymanweb.util.loadCookie('KeymanWeb_Keyboard');
                if (typeof (v['current']) != 'string') {
                    return 'Keyboard_us:eng';
                }
                // Check that the requested keyboard is included in the available keyboard stubs
                var n, stubs = this.keyboardStubs, kd;
                for (n = 0; n < stubs.length; n++) {
                    kd = stubs[n]['KI'] + ':' + stubs[n]['KLC'];
                    if (kd == v['current'])
                        return kd;
                }
                // Default to US English if available (but don't assume it is first)
                for (n = 0; n < stubs.length; n++) {
                    kd = stubs[n]['KI'] + ':' + stubs[n]['KLC'];
                    if (kd == 'Keyboard_us:eng')
                        return kd;
                }
                // Otherwise use the first keyboard stub
                if (stubs.length > 0) {
                    return stubs[0]['KI'] + ':' + stubs[0]['KLC'];
                }
                // Or US English if no stubs loaded (should never happen)
                return 'Keyboard_us:eng';
            };
            /**
             * Function    isCJK
             * Scope       Public
             * @param      {Object=}  k0
             * @return     {boolean}
             * Description Tests if active keyboard (or optional argument) uses a pick list (Chinese, Japanese, Korean, etc.)
             *             (This function accepts either keyboard structure.)
             */
            KeyboardManager.prototype.isCJK = function (k0) {
                var k = this.activeKeyboard, lg = '';
                if (arguments.length > 0) {
                    k = k0;
                }
                if (k) {
                    if (typeof (k['KLC']) != 'undefined') {
                        lg = k['KLC'];
                    }
                    else if (typeof (k['LanguageCode']) != 'undefined') {
                        lg = k['LanguageCode'];
                    }
                }
                return ((lg == 'cmn') || (lg == 'jpn') || (lg == 'kor'));
            };
            KeyboardManager.prototype.isRTL = function (k0) {
                var k = k0 || this.activeKeyboard;
                return (k != null) && (k['KRTL']);
            };
            /**
             * Function     isChiral
             * Scope        Public
             * @param       {string|Object=}   k0
             * @return      {boolean}
             * Description  Tests if the active keyboard (or optional argument) uses chiral modifiers.
             */
            KeyboardManager.prototype.isChiral = function (k0) {
                if (typeof (k0) == "string") {
                    k0 = this.getKeyboardByID(k0);
                }
                return !!(this.getKeyboardModifierBitmask(k0) & this.keymanweb.osk.modifierBitmasks.IS_CHIRAL);
            };
            /**
             * Function     getKeyboardModifierBitmask
             * Scope        Private
             * @param       {Object=}   k0
             * @return      {number}
             * Description  Obtains the currently-active modifier bitmask for the active keyboard.
             */
            KeyboardManager.prototype.getKeyboardModifierBitmask = function (k0) {
                var k = this.activeKeyboard;
                if (arguments.length > 0 && typeof k0 != 'undefined') {
                    k = k0;
                }
                if (!k) {
                    return 0x0000;
                }
                if (k['KMBM']) {
                    return k['KMBM'];
                }
                return this.keymanweb.osk.modifierBitmasks['NON_CHIRAL'];
            };
            KeyboardManager.prototype.getFont = function (k0) {
                var k = k0 || this.activeKeyboard;
                if (k && k['KV']) {
                    return k['KV']['F'];
                }
                return null;
            };
            /**
             * Function     _getKeyboardByID
             * Scope        Private
             * @param       {string}  keyboardID
             * @return      {Object|null}
             * Description  Returns the internal, registered keyboard object - not the stub, but the keyboard itself.
             */
            KeyboardManager.prototype.getKeyboardByID = function (keyboardID) {
                var Li;
                for (Li = 0; Li < this.keyboards.length; Li++) {
                    if (keyboardID == this.keyboards[Li]['KI']) {
                        return this.keyboards[Li];
                    }
                }
                return null;
            };
            /* ------------------------------------------------------------
            *  Definitions for adding, removing, and requesting keyboards.
            *  ------------------------------------------------------------
            */
            /**
             * Function       isUniqueRequest
             * Scope          Private
             * @param         {Object}    tEntry
             * Description    Checks to ensure that the stub isn't already loaded within KMW or subject
             *                to an already-pending request.
             */
            KeyboardManager.prototype.isUniqueRequest = function (cloudList, tEntry) {
                var k;
                if (this.findStub(tEntry.id, tEntry.language) == null) {
                    for (k = 0; k < cloudList.length; k++) {
                        if (cloudList[k].id == tEntry['id'] && cloudList[k].language == tEntry.language) {
                            return false;
                        }
                    }
                    return true;
                }
                else {
                    return false;
                }
            };
            ;
            /**
             * Build 362: addKeyboardArray() link to Cloud. One or more arguments may be used
             *
             * @param {string|Object} x keyboard name string or keyboard metadata JSON object
             *
             */
            KeyboardManager.prototype.addKeyboardArray = function (x) {
                // Store all keyboard meta-data for registering later if called before initialization
                if (!this.keymanweb.initialized) {
                    for (var k = 0; k < x.length; k++) {
                        this.deferredStubs.push(x[k]);
                    }
                    return;
                }
                // Ignore empty array passed as argument
                if (x.length == 0) {
                    return;
                }
                // Create a temporary array of metadata objects from the arguments used
                var i, j, kp, kbid, lgid, kvid, cmd = '', comma = '';
                var cloudList = [];
                var tEntry;
                for (i = 0; i < x.length; i++) {
                    if (typeof (x[i]) == 'string' && x[i].length > 0) {
                        var pList = x[i].split('@'), lList = [''];
                        if (pList[0].toLowerCase() == 'english') {
                            pList[0] = 'us';
                        }
                        if (pList.length > 1) {
                            lList = pList[1].split(',');
                        }
                        for (j = 0; j < lList.length; j++) {
                            tEntry = new CloudRequestEntry(pList[0]);
                            if (lList[j] != '') {
                                tEntry.language = lList[j];
                            }
                            if (pList.length > 2) {
                                tEntry.version = pList[2];
                            }
                            // If we've already registered or requested a stub for this keyboard-language pairing,
                            // don't bother with a cloud request.
                            if (this.isUniqueRequest(cloudList, tEntry)) {
                                cloudList.push(tEntry);
                            }
                        }
                    }
                    if (typeof (x[i]) == 'object' && x[i] != null) {
                        // Register any local keyboards immediately:
                        // - must specify filename, keyboard name, language codes, region codes
                        // - no request will be sent to cloud
                        var stub = x[i];
                        if (typeof (x[i]['filename']) == 'string') {
                            if (!this.addStub(x[i])) {
                                alert('To use a custom keyboard, you must specify file name, keyboard name, language, language code and region code.');
                            }
                        }
                        else {
                            if (x[i]['language']) {
                                console.warn("The 'language' property for keyboard stubs has been deprecated.  Please use the 'languages' property instead.");
                                x[i]['languages'] = x[i]['language'];
                            }
                            lList = x[i]['languages'];
                            //Array or single entry?
                            if (typeof (lList.length) == 'number') {
                                for (j = 0; j < lList.length; j++) {
                                    tEntry = new CloudRequestEntry(x[i]['id'], x[i]['languages'][j]['id']);
                                    if (this.isUniqueRequest(cloudList, tEntry)) {
                                        cloudList.push(tEntry);
                                    }
                                }
                            }
                            else { // Single language element
                                tEntry = new CloudRequestEntry(x[i]['id'], x[i]['languages'][j]['id']);
                                if (this.isUniqueRequest(cloudList, tEntry)) {
                                    cloudList.push(tEntry);
                                }
                            }
                        }
                    }
                }
                // Return if all keyboards being registered are local and fully specified
                if (cloudList.length == 0) {
                    return;
                }
                // Update the keyboard metadata list from keyman.com - build the command
                cmd = '&keyboardid=';
                for (i = 0; i < cloudList.length; i++) {
                    cmd = cmd + comma + cloudList[i].toString();
                    comma = ',';
                }
                // Request keyboard metadata from the Keyman Cloud keyboard metadata server
                this.keymanCloudRequest(cmd, false);
            };
            /**
             *  Register a keyboard for each associated language
             *
             *  @param  {Object}  kp  Keyboard Object or Object array
             *  @param  {Object}  options   keymanCloud callback options
             *  @param  {number}  nArg  keyboard index in argument array
             *
             **/
            KeyboardManager.prototype.registerLanguagesForKeyboard = function (kp, options, nArg) {
                var i, j, id, nDflt = 0, kbId = '';
                // Do not attempt to process badly formatted requests
                if (typeof (kp) == 'undefined') {
                    return;
                }
                if (typeof (options['keyboardid']) == 'string') {
                    kbId = options['keyboardid'].split(',')[nArg];
                }
                // When keyboards requested by language code, several keyboards may be returned as an array
                if (typeof (kp.length) == 'number') {
                    // If language code is suffixed by $, register all keyboards for this language
                    if (kp.length == 1 || kbId.substr(-1, 1) == '$' || kbId == '') {
                        for (i = 0; i < kp.length; i++) {
                            this.registerLanguagesForKeyboard(kp[i], options, nArg);
                        }
                    }
                    // Register the default keyboard for the language code
                    // Until a default is defined, the default will be the Windows keyboard, 
                    // that is, the keyboard named for the language (exception: English:US), or the
                    // first keyboard found.
                    else {
                        for (i = 0; i < kp.length; i++) {
                            id = kp[i].id.toLowerCase();
                            if (id == 'us') {
                                id = 'english';
                            }
                            for (j = 0; j < kp[i]['languages'].length; j++) {
                                if (id == kp[i]['languages'][j]['name'].toLowerCase()) {
                                    nDflt = i;
                                    break;
                                }
                            }
                        }
                        this.registerLanguagesForKeyboard(kp[nDflt], options, nArg);
                    }
                }
                else { // Otherwise, process a single keyboard for the specified languages 
                    // May need to filter returned stubs by language
                    var lgCode = kbId.split('@')[1];
                    if (typeof (lgCode) == 'string') {
                        lgCode = lgCode.replace(/\$$/, '');
                    }
                    // Can only add keyboard stubs for defined languages
                    var ll = kp['languages'];
                    if (typeof (ll) != 'undefined') {
                        if (typeof (ll.length) == 'number') {
                            for (i = 0; i < ll.length; i++) {
                                if (typeof (lgCode) == 'undefined' || ll[i]['id'] == lgCode) {
                                    this.mergeStub(kp, ll[i], options);
                                }
                            }
                        }
                        else {
                            this.mergeStub(kp, ll, options);
                        }
                    }
                }
            };
            /**
             * Call back from cloud for adding keyboard metadata
             *
             * @param {Object}    x   metadata object
             **/
            KeyboardManager.prototype.register = function (x) {
                var options = x['options'];
                // Always clear the timer associated with this callback
                if (x['timerid']) {
                    window.clearTimeout(x['timerid']);
                }
                // Indicate if unable to register keyboard
                if (typeof (x['error']) == 'string') {
                    var badName = '';
                    if (typeof (x['keyboardid']) == 'string') {
                        badName = x['keyboardid'].substr(0, 1).toUpperCase() + x['keyboardid'].substr(1);
                    }
                    this.serverUnavailable(badName + ' keyboard not found.');
                    return;
                }
                // Ignore callback unless the context is defined
                if (typeof (options) == 'undefined' || typeof (options['context']) == 'undefined') {
                    return;
                }
                // Register each keyboard for the specified language codes
                if (options['context'] == 'keyboard') {
                    var i, kp = x['keyboard'];
                    // Process array of keyboard definitions
                    if (typeof (kp.length) == 'number') {
                        for (i = 0; i < kp.length; i++) {
                            this.registerLanguagesForKeyboard(kp[i], options, i);
                        }
                    }
                    else { // Process a single keyboard definition
                        this.registerLanguagesForKeyboard(kp, options, 0);
                    }
                }
                else if (options['context'] == 'language') { // Download the full list of supported keyboard languages
                    this.languageList = x['languages'];
                    if (this.languagesPending) {
                        this.addLanguageKeyboards(this.languagesPending);
                    }
                    this.languagesPending = [];
                }
            };
            /**
             *  Add default or all keyboards for a given language
             *
             *  @param  {Object}   languages    Array of language names
             **/
            KeyboardManager.prototype.addLanguageKeyboards = function (languages) {
                var i, j, lgName, cmd, first, addAll;
                // Defer registering keyboards by language until the language list has been loaded
                if (this.languageList == null) {
                    first = (this.languagesPending.length == 0);
                    for (i = 0; i < languages.length; i++) {
                        this.languagesPending.push(languages[i]);
                    }
                    if (first) {
                        this.keymanCloudRequest('', true);
                    }
                }
                else { // Identify and register each keyboard by language name
                    cmd = '';
                    for (i = 0; i < languages.length; i++) {
                        lgName = languages[i].toLowerCase();
                        addAll = (lgName.substr(-1, 1) == '$');
                        if (addAll) {
                            lgName = lgName.substr(0, lgName.length - 1);
                        }
                        for (j = 0; j < this.languageList.length; j++) {
                            if (lgName == this.languageList[j]['name'].toLowerCase()) {
                                if (cmd != '') {
                                    cmd = cmd + ',';
                                }
                                cmd = cmd + '@' + this.languageList[j]['id'];
                                if (addAll) {
                                    cmd = cmd + '$';
                                }
                                break;
                            }
                        }
                    }
                    if (cmd == '') {
                        this.keymanweb.util.alert('No keyboards are available for ' + languages[0] + '. '
                            + 'Does it have another language name?');
                    }
                    else {
                        this.keymanCloudRequest('&keyboardid=' + cmd, false);
                    }
                }
            };
            /**
             *  Request keyboard metadata from the Keyman Cloud keyboard metadata server
             *
             *  @param  {string}   cmd        command string
             *  @param  {boolean?} byLanguage if true, context=languages, else context=keyboards
             **/
            KeyboardManager.prototype.keymanCloudRequest = function (cmd, byLanguage) {
                var URL = 'https://api.keyman.com/cloud/4.0/', tFlag, Lscript = this.keymanweb.util._CreateElement('script');
                URL = URL + ((arguments.length > 1) && byLanguage ? 'languages' : 'keyboards')
                    + '?jsonp=keyman.register&languageidtype=bcp47&version=' + this.keymanweb['version'] + '.' + keyman.KeymanBase['__BUILD__'];
                var kbdManager = this;
                // Set callback timer
                tFlag = '&timerid=' + window.setTimeout(function () {
                    kbdManager.serverUnavailable(cmd);
                }, 10000);
                Lscript.charset = "UTF-8";
                Lscript.src = URL + cmd + tFlag;
                Lscript.type = 'text/javascript';
                try {
                    document.body.appendChild(Lscript);
                }
                catch (ex) {
                    document.getElementsByTagName('head')[0].appendChild(Lscript);
                }
            };
            /**
             *  Display warning if Keyman Cloud server fails to respond
             *
             *  @param  {string}  cmd command string sent to Cloud
             *
             **/
            KeyboardManager.prototype.serverUnavailable = function (cmd) {
                this.keymanweb.util.alert(cmd == '' ? 'Unable to connect to Keyman Cloud server!' : cmd);
                this.keymanweb.warned = true;
            };
            /**
             * Build 362: removeKeyboards() remove keyboard from list of available keyboards
             *
             * @param {string} x keyboard name string
             *
             */
            KeyboardManager.prototype.removeKeyboards = function (x) {
                if (arguments.length == 0) {
                    return false;
                }
                var i, j;
                var success = true, activeRemoved = false, anyRemoved = false;
                ;
                for (i = 0; i < arguments.length; i++) {
                    for (j = this.keyboardStubs.length - 1; j >= 0; j--) {
                        if ('Keyboard_' + arguments[i] == this.keyboardStubs[j]['KI']) {
                            if ('Keyboard_' + arguments[i] == this.getActiveKeyboardName()) {
                                activeRemoved = true;
                            }
                            anyRemoved = true;
                            this.keyboardStubs.splice(j, 1);
                            break;
                        }
                    }
                    if (j < 0) {
                        success = false;
                    }
                }
                if (activeRemoved) {
                    if (this.keyboardStubs.length > 0) {
                        // Always reset to the first remaining keyboard
                        this._SetActiveKeyboard(this.keyboardStubs[0]['KI'], this.keyboardStubs[0]['KLC'], true);
                    }
                    else {
                        this._SetActiveKeyboard('', '', false);
                    }
                    // This is likely to be triggered by a UI call of some sort, and we need to treat
                    // this call as such to properly maintain the globalKeyboard setting.
                    this.keymanweb.uiManager.justActivated = true;
                }
                if (anyRemoved) {
                    // Update the UI keyboard menu
                    this.doKeyboardUnregistered();
                }
                return success;
            };
            /**
             * Function     _registerKeyboard  KR
             * Scope        Public
             * @param       {Object}      Pk      Keyboard  object
             * Description  Register and load the keyboard
             */
            KeyboardManager.prototype._registerKeyboard = function (Pk) {
                // If initialization not yet complete, list the keyboard to be registered on completion of initialization
                if (!this.keymanweb.initialized) {
                    this.deferredKR.push(Pk);
                    return;
                }
                if (Pk['_kmw']) {
                    console.error("The keyboard _kmw property is a reserved field for engine use only; this keyboard is invalid.");
                    return;
                }
                else {
                    Pk['_kmw'] = new KeyboardTag();
                }
                var Li, Lstub;
                // For package namespacing with KMEA/KMEI.
                if (this.keymanweb.isEmbedded) {
                    this.keymanweb.preserveID(Pk);
                }
                // Check if the active stub refers to this keyboard, else find applicable stub
                var Ps = this.activeStub;
                var savedActiveStub = this.activeStub;
                if (!Ps || !('KI' in Ps) || (Ps['KI'] != Pk['KI'])) {
                    // Find the first stub for this keyboard
                    for (Lstub = 0; Lstub < this.keyboardStubs.length; Lstub++) { // I1511 - array prototype extended
                        Ps = this.keyboardStubs[Lstub];
                        if (Pk['KI'] == Ps['KI']) {
                            break;
                        }
                        Ps = null;
                    }
                }
                // Build 369: ensure active stub defined when loading local keyboards 
                if (this.activeStub == null && Ps != null) {
                    this.activeStub = Ps;
                }
                // Register the stub for this language (unless it is already registered)
                // keymanweb.KRS(Ps?Ps:Pk); 
                // Test if keyboard already loaded
                for (Li = 0; Li < this.keyboards.length; Li++) {
                    if (Pk['KI'] == this.keyboards[Li]['KI']) {
                        return;
                    }
                }
                // Append to keyboards array
                this.keyboards = this.keymanweb._push(this.keyboards, Pk); // TODO:  Resolve without need for the cast.
                // Execute any external (UI) code needed after loading keyboard
                this.doKeyboardLoaded(Pk['KI']);
                // Restore the originally-active stub to its prior state.  No need to change it permanently.
                this.activeStub = savedActiveStub;
            };
            /**
             * Add the basic keyboard parameters (keyboard stub) to the array of keyboard stubs
             * If no language code is specified in a keyboard it cannot be registered,
             * and a keyboard stub must be registered before the keyboard is loaded
             * for the keyboard to be usable.
             *
             * @param       {Object}      Pstub     Keyboard stub object
             * @return      {?number}               1 if already registered, else null
             */
            KeyboardManager.prototype._registerStub = function (Pstub) {
                var Lk;
                // In initialization not complete, list the stub to be registered on completion of initialization
                if (!this.keymanweb.initialized) {
                    this.deferredKRS.push(Pstub);
                    return null;
                }
                // The default stub is always the first keyboard stub loaded [and will be ignored by desktop browsers - not for beta, anyway]
                if (this.dfltStub == null) {
                    this.dfltStub = Pstub;
                    //if(device.formFactor == 'desktop') return 1;    //Needs further thought before release
                }
                // If no language code has been defined, and no stub has been registered for this keyboard, register with empty string as the language code
                if (this.keymanweb.isEmbedded) {
                    this.keymanweb.namespaceID(Pstub);
                } // else leave undefined.  It's nice to condition upon.
                if (typeof (Pstub['KLC']) == 'undefined') {
                    Pstub['KLC'] = '';
                }
                if (typeof (Pstub['KL']) == 'undefined') {
                    Pstub['KL'] = 'undefined';
                }
                // If language code already defined (or not specified in stub), check to see if stub already registered
                for (Lk = 0; Lk < this.keyboardStubs.length; Lk++) {
                    if (this.keyboardStubs[Lk]['KI'] == Pstub['KI']) {
                        if (Pstub['KLC'] == '' || (this.keyboardStubs[Lk]['KLC'] == Pstub['KLC'])) {
                            return 1; // no need to register
                        }
                    }
                }
                // Register stub (add to KeyboardStubs array)
                this.keyboardStubs = this.keymanweb._push(this.keyboardStubs, Pstub); // TODO:  Resolve without need for the cast.
                // TODO: Need to distinguish between initial loading of a large number of stubs and any subsequent loading.
                //   UI initialization should not be needed for each registration, only at end.
                // Reload this keyboard if it was the last active keyboard and 
                // make any changes needed by UI for new keyboard stub
                // (Uncommented for Build 360)
                this.doKeyboardRegistered(Pstub['KI'], Pstub['KL'], Pstub['KN'], Pstub['KLC'], Pstub['KP']);
                // If we have no activeStub because there were no stubs, set the new keyboard as active.
                // Do not trigger on merges.
                if (!this.activeStub && this.dfltStub == Pstub && this.keyboardStubs.length == 1) {
                    this.setActiveKeyboard(Pstub['KI'], Pstub['KLC']);
                }
                return null;
            };
            /*
            * Last part - the events.
            */
            /**
             * Execute external (UI) code needed on registering keyboard, used
             * to update each UIs language menu
             *
             * Note that the argument object is not at present used by any UI,
             * since the menu is always fully recreated when needed, but the arguments
             * remain defined to allow for possible use in future (Aug 2014)
             *
             * @param       {string}            _internalName
             * @param       {string}            _language
             * @param       {string}            _keyboardName
             * @param       {string}            _languageCode
             * @param       {string=}           _packageID        Used by KMEA/KMEI to track .kmp related info.
             * @return      {boolean}
             */
            KeyboardManager.prototype.doKeyboardRegistered = function (_internalName, _language, _keyboardName, _languageCode, _packageID) {
                var p = { 'internalName': _internalName, 'language': _language, 'keyboardName': _keyboardName, 'languageCode': _languageCode };
                // Utilized only by our embedded codepaths.
                if (_packageID) {
                    p['package'] = _packageID;
                }
                return this.keymanweb.util.callEvent('kmw.keyboardregistered', p);
            };
            /**
             * Execute external (UI) code to rebuild menu when deregistering keyboard
             *
             * @return      {boolean}
             */
            KeyboardManager.prototype.doKeyboardUnregistered = function () {
                var p = {};
                return this.keymanweb.util.callEvent('kmw.keyboardregistered', p);
            };
            /**
             * Execute external (UI) code needed on loading keyboard
             *
             * @param       {string}            _internalName
             * @return      {boolean}
             */
            KeyboardManager.prototype.doKeyboardLoaded = function (_internalName) {
                var p = {};
                p['keyboardName'] = _internalName;
                return this.keymanweb.util.callEvent('kmw.keyboardloaded', p);
            };
            /**
             * Function     doBeforeKeyboardChange
             * Scope        Private
             * @param       {string}            _internalName
             * @param       {string}            _languageCode
             * @return      {boolean}
             * Description  Execute external (UI) code needed before changing keyboard
             */
            KeyboardManager.prototype.doBeforeKeyboardChange = function (_internalName, _languageCode) {
                var p = {};
                p['internalName'] = _internalName;
                p['languageCode'] = _languageCode;
                return this.keymanweb.util.callEvent('kmw.beforekeyboardchange', p);
            };
            /**
             * Execute external (UI) code needed *after* changing keyboard
             *
             * @param       {string}            _internalName
             * @param       {string}            _languageCode
             * @param       {boolean=}           _indirect
             * @return      {boolean}
             */
            KeyboardManager.prototype.doKeyboardChange = function (_internalName, _languageCode, _indirect) {
                var p = {};
                p['internalName'] = _internalName;
                p['languageCode'] = _languageCode;
                p['indirect'] = (arguments.length > 2 ? _indirect : false);
                return this.keymanweb.util.callEvent('kmw.keyboardchange', p);
            };
            KeyboardManager.prototype.shutdown = function () {
                for (var _i = 0, _a = this.linkedScripts; _i < _a.length; _i++) {
                    var script = _a[_i];
                    if (script.remove) {
                        script.remove();
                    }
                    else if (script.parentNode) {
                        script.parentNode.removeChild(script);
                    }
                }
            };
            // Language regions as defined by cloud server
            KeyboardManager.regions = ['World', 'Africa', 'Asia', 'Europe', 'South America', 'North America', 'Oceania', 'Central America', 'Middle East'];
            KeyboardManager.regionCodes = ['un', 'af', 'as', 'eu', 'sa', 'na', 'oc', 'ca', 'me'];
            return KeyboardManager;
        }());
        keyman.KeyboardManager = KeyboardManager;
    })(keyman = com.keyman || (com.keyman = {}));
})(com || (com = {}));
/***
   KeymanWeb 11.0
   Copyright 2019 SIL International
***/
var com;
(function (com) {
    var keyman;
    (function (keyman) {
        var KeyMap = /** @class */ (function () {
            function KeyMap() {
            }
            return KeyMap;
        }());
        var BrowserKeyMaps = /** @class */ (function () {
            function BrowserKeyMaps() {
                this.FF = new KeyMap();
                this.Safari = new KeyMap();
                this.Opera = new KeyMap();
                //ffie['k109'] = 189; // -    // These two number-pad VK rules are *not* correct for more recent FF! JMD 8/11/12
                //ffie['k107'] = 187; // =    // FF 3.0 // I2062
                this.FF['k61'] = 187; // =   // FF 2.0
                this.FF['k59'] = 186; // ;
            }
            return BrowserKeyMaps;
        }());
        var LanguageKeyMaps = /** @class */ (function () {
            function LanguageKeyMaps() {
                /* I732 START - 13/03/2007 MCD: Swedish: Start mapping of keystroke to US keyboard #2 */
                // Swedish key map
                this['se'] = new KeyMap();
                this['se']['k220'] = 192; // `
                this['se']['k187'] = 189; // -
                this['se']['k219'] = 187; // =
                this['se']['k221'] = 219; // [
                this['se']['k186'] = 221; // ]
                this['se']['k191'] = 220; // \
                this['se']['k192'] = 186; // ;
                this['se']['k189'] = 191; // /
                this['uk'] = new KeyMap(); // I1299
                this['uk']['k223'] = 192; // // ` U+00AC (logical not) =>  ` ~
                this['uk']['k192'] = 222; // ' @  =>  ' "
                this['uk']['k222'] = 226; // # ~  => K_oE2     // I1504 - UK keyboard mixup #, \
                this['uk']['k220'] = 220; // \ |  => \ |       // I1504 - UK keyboard mixup #, \
            }
            return LanguageKeyMaps;
        }());
        var KeyMapManager = /** @class */ (function () {
            function KeyMapManager() {
                this.browserMap = new BrowserKeyMaps();
                this.languageMap = new LanguageKeyMaps();
                this._usCodeInit();
            }
            KeyMapManager.prototype._usCodeInit = function () {
                var s0 = new KeyMap(), s1 = new KeyMap();
                s0['k192'] = 96;
                s0['k49'] = 49;
                s0['k50'] = 50;
                s0['k51'] = 51;
                s0['k52'] = 52;
                s0['k53'] = 53;
                s0['k54'] = 54;
                s0['k55'] = 55;
                s0['k56'] = 56;
                s0['k57'] = 57;
                s0['k48'] = 48;
                s0['k189'] = 45;
                s0['k187'] = 61;
                s0['k81'] = 113;
                s0['k87'] = 119;
                s0['k69'] = 101;
                s0['k82'] = 114;
                s0['k84'] = 116;
                s0['k89'] = 121;
                s0['k85'] = 117;
                s0['k73'] = 105;
                s0['k79'] = 111;
                s0['k80'] = 112;
                s0['k219'] = 91;
                s0['k221'] = 93;
                s0['k220'] = 92;
                s0['k65'] = 97;
                s0['k83'] = 115;
                s0['k68'] = 100;
                s0['k70'] = 102;
                s0['k71'] = 103;
                s0['k72'] = 104;
                s0['k74'] = 106;
                s0['k75'] = 107;
                s0['k76'] = 108;
                s0['k186'] = 59;
                s0['k222'] = 39;
                s0['k90'] = 122;
                s0['k88'] = 120;
                s0['k67'] = 99;
                s0['k86'] = 118;
                s0['k66'] = 98;
                s0['k78'] = 110;
                s0['k77'] = 109;
                s0['k188'] = 44;
                s0['k190'] = 46;
                s0['k191'] = 47;
                s1['k192'] = 126;
                s1['k49'] = 33;
                s1['k50'] = 64;
                s1['k51'] = 35;
                s1['k52'] = 36;
                s1['k53'] = 37;
                s1['k54'] = 94;
                s1['k55'] = 38;
                s1['k56'] = 42;
                s1['k57'] = 40;
                s1['k48'] = 41;
                s1['k189'] = 95;
                s1['k187'] = 43;
                s1['k81'] = 81;
                s1['k87'] = 87;
                s1['k69'] = 69;
                s1['k82'] = 82;
                s1['k84'] = 84;
                s1['k89'] = 89;
                s1['k85'] = 85;
                s1['k73'] = 73;
                s1['k79'] = 79;
                s1['k80'] = 80;
                s1['k219'] = 123;
                s1['k221'] = 125;
                s1['k220'] = 124;
                s1['k65'] = 65;
                s1['k83'] = 83;
                s1['k68'] = 68;
                s1['k70'] = 70;
                s1['k71'] = 71;
                s1['k72'] = 72;
                s1['k74'] = 74;
                s1['k75'] = 75;
                s1['k76'] = 76;
                s1['k186'] = 58;
                s1['k222'] = 34;
                s1['k90'] = 90;
                s1['k88'] = 88;
                s1['k67'] = 67;
                s1['k86'] = 86;
                s1['k66'] = 66;
                s1['k78'] = 78;
                s1['k77'] = 77;
                s1['k188'] = 60;
                s1['k190'] = 62;
                s1['k191'] = 63;
                this._usCharCodes = [s0, s1];
            };
            /**
             * Function     _USKeyCodeToCharCode
             * Scope        Private
             * @param       {Event}     Levent      KMW event object
             * @return      {number}                Character code
             * Description Translate keyboard codes to standard US layout codes
             */
            KeyMapManager.prototype._USKeyCodeToCharCode = function (Levent) {
                return this._usCharCodes[Levent.Lmodifiers & 0x10 ? 1 : 0]['k' + Levent.Lcode];
            };
            ;
            return KeyMapManager;
        }());
        keyman.KeyMapManager = KeyMapManager;
    })(keyman = com.keyman || (com.keyman = {}));
})(com || (com = {}));
var com;
(function (com) {
    var keyman;
    (function (keyman_4) {
        var Hotkey = /** @class */ (function () {
            function Hotkey(code, shift, handler) {
                this.code = code;
                this.shift = shift;
                this.handler = handler;
            }
            Hotkey.prototype.matches = function (keyCode, shiftState) {
                return (this.code == keyCode && this.shift == shiftState);
            };
            return Hotkey;
        }());
        var HotkeyManager = /** @class */ (function () {
            function HotkeyManager(keyman) {
                this.hotkeys = [];
                /**
                 * Function     _Process
                 * Scope        Private
                 * @param       {Event}       e       event
                 * Description  Passes control to handlers according to the hotkey pressed
                 */
                this._Process = function (e) {
                    if (!e) {
                        e = window.event;
                    }
                    var _Lcode = this.keyman.domManager.nonTouchHandlers._GetEventKeyCode(e);
                    if (_Lcode == null) {
                        return false;
                    }
                    // Removed testing of e.shiftKey==null  I3363 (Build 301)
                    var _Lmodifiers = (e.shiftKey ? 0x10 : 0) |
                        (e.ctrlKey ? 0x20 : 0) |
                        (e.altKey ? 0x40 : 0);
                    for (var i = 0; i < this.hotkeys.length; i++) {
                        if (this.hotkeys[i].matches(_Lcode, _Lmodifiers)) {
                            this.hotkeys[i].Handler();
                            e.returnValue = false;
                            if (e && e.preventDefault)
                                e.preventDefault();
                            e.cancelBubble = true;
                            return false;
                        }
                    }
                    return true;
                }.bind(this);
                this.keyman = keyman;
            }
            /**
             * Function     addHotkey
             * Scope        Public
             * @param       {number}            keyCode
             * @param       {number}            shiftState
             * @param       {function(Object)}  handler
             * Description  Add hot key handler to array of document-level hotkeys triggered by key up event
             */
            HotkeyManager.prototype.addHotKey = function (keyCode, shiftState, handler) {
                // Test if existing handler for this code and replace it if so
                for (var i = 0; i < this.hotkeys.length; i++) {
                    if (this.hotkeys[i].code == keyCode && this.hotkeys[i].shift == shiftState) {
                        this.hotkeys[i].handler = handler;
                        return;
                    }
                }
                // Otherwise add it to the array
                this.hotkeys.push(new Hotkey(keyCode, shiftState, handler));
            };
            /**
             * Function     removeHotkey
             * Scope        Public
             * @param       {number}        keyCode
             * @param       {number}        shiftState
             * Description  Remove a hot key handler from array of document-level hotkeys triggered by key up event
             */
            /*keymanweb['removeHotKey'] = */ HotkeyManager.prototype.removeHotkey = function (keyCode, shiftState) {
                for (var i = 0; i < this.hotkeys.length; i++) {
                    if (this.hotkeys[i].matches(keyCode, shiftState)) {
                        this.hotkeys.splice(i, 1);
                        return;
                    }
                }
            };
            return HotkeyManager;
        }());
        keyman_4.HotkeyManager = HotkeyManager;
    })(keyman = com.keyman || (com.keyman = {}));
})(com || (com = {}));
var com;
(function (com) {
    var keyman;
    (function (keyman_5) {
        var UIState = /** @class */ (function () {
            function UIState(pending, activated) {
                this['activationPending'] = pending;
                this['activated'] = activated;
            }
            return UIState;
        }());
        keyman_5.UIState = UIState;
        var UIManager = /** @class */ (function () {
            function UIManager(keyman) {
                this.isActivating = false; // ActivatingKeymanWebUI - is the KeymanWeb DIV in process of being clicked on?
                this.justActivated = false; // JustActivatedKeymanWebUI - focussing back to control after KeymanWeb UI interaction
                /**
                 * Function     doUnload
                 * Scope        Private
                 * @return      {boolean}
                 * Description  Execute UI cleanup code before unloading the UI (may not be required?)
                 */
                this.doUnload = function () {
                    var p = {};
                    return this.keyman.util.callEvent('kmw.unloaduserinterface', p);
                };
                this.keyman = keyman;
            }
            /**
             * Function     getUIState
             * Scope        Public
             * @return      {Object.<string,boolean>}
             * Description  Return object with activation state of UI:
             *                activationPending (bool):   KMW being activated
             *                activated         (bool):   KMW active
             */
            UIManager.prototype.getUIState = function () {
                return new UIState(this.isActivating, this.justActivated);
            };
            /**
             * Set or clear the IsActivatingKeymanWebUI flag (exposed function)
             *
             * @param       {(boolean|number)}  state  Activate (true,false)
             */
            UIManager.prototype.setActivatingUI = function (state) {
                this.isActivating = state ? true : false;
            };
            /**
             * Function     doLoad
             * Scope        Private
             * @return      {boolean}
             * Description  Execute UI initialization code after loading the UI
             *              // Appears to be unused; could be eliminated?  Though, doUnload IS used.
             */
            UIManager.prototype.doLoad = function () {
                var p = {};
                return this.keyman.util.callEvent('kmw.loaduserinterface', p);
            };
            return UIManager;
        }());
        keyman_5.UIManager = UIManager;
    })(keyman = com.keyman || (com.keyman = {}));
})(com || (com = {}));
// Includes KMW-added property declaration extensions for HTML elements.
/// <reference path="kmwexthtml.ts" />
// Includes a promise polyfill (needed for IE)
/// <reference path="../node_modules/promise-polyfill/lib/polyfill.js" />
// Defines build-environment includes, since `tsc` doesn't provide a compile-time define.
/// <reference path="environment.inc.ts" />
// Defines the web-page interface object.
/// <reference path="kmwdom.ts" />
// Includes KMW-added property declaration extensions for HTML elements.
/// <reference path="kmwutils.ts" />
// Defines the keyboard callback object.
/// <reference path="kmwcallback.ts" />
// Defines keyboard data & management classes.
/// <reference path="kmwkeyboards.ts" />
// Defines built-in keymapping.
/// <reference path="kmwkeymaps.ts" />
// Defines KMW's hotkey management object.
/// <reference path="kmwhotkeys.ts" />
// Defines the ui management code that tracks UI activation and such.
/// <reference path="kmwuimanager.ts" />
/***
   KeymanWeb 11.0
   Copyright 2017-2019 SIL International
***/
var com;
(function (com) {
    var keyman;
    (function (keyman) {
        var KeymanBase = /** @class */ (function () {
            // -------------
            function KeymanBase() {
                this._TitleElement = null; // I1972 - KeymanWeb Titlebar should not be a link
                this._IE = 0; // browser version identification
                this._MasterDocument = null; // Document with controller (to allow iframes to distinguish local/master control)
                this._HotKeys = []; // Array of document-level hotkey objects
                this.warned = false; // Warning flag (to prevent multiple warnings)
                this.baseFont = 'sans-serif'; // Default font for mapped input elements
                this.appliedFont = ''; // Chain of fonts to be applied to mapped input elements
                this.fontCheckTimer = null; // Timer for testing loading of embedded fonts
                this.srcPath = ''; // Path to folder containing executing keymanweb script
                this.rootPath = ''; // Path to server root
                this.protocol = ''; // Protocol used for the KMW script.
                this.mustReloadKeyboard = false; // Force keyboard refreshing even if already loaded
                this.globalKeyboard = null; // Indicates the currently-active keyboard for controls without independent keyboard settings.
                this.globalLanguageCode = null; // Indicates the language code corresponding to `globalKeyboard`.
                this.isEmbedded = false; // Indicates if the KeymanWeb instance is embedded within a mobile app.
                // Blocks full page initialization when set to `true`.
                this.refocusTimer = 0; // Tracks a timeout event that aids of OSK modifier/state key tracking when the document loses focus.
                this['build'] = 300; // TS needs this to be defined within the class.
                // Defines option-tracking object as a string map.
                this.options = {
                    'root': '',
                    'resources': '',
                    'keyboards': '',
                    'fonts': '',
                    'attachType': '',
                    'ui': null
                };
                this.refreshElementContent = null;
                // Allow internal minification of the public modules.
                this.util = this['util'] = new keyman.Util(this);
                window['KeymanWeb'] = this.interface = this['interface'] = new keyman.KeyboardInterface(this);
                this.osk = this['osk'] = { ready: false };
                this.ui = this['ui'] = null;
                this.keyboardManager = new keyman.KeyboardManager(this);
                this.domManager = new keyman.DOMManager(this);
                this.hotkeyManager = new keyman.HotkeyManager(this);
                this.uiManager = new keyman.UIManager(this);
                this.keyMapManager = new keyman.KeyMapManager();
                // Load properties from their static variants.
                this['build'] = KeymanBase.__BUILD__;
                this.srcPath = KeymanBase._srcPath;
                this.rootPath = KeymanBase._rootPath;
                this.protocol = KeymanBase._protocol;
                this['version'] = com.keyman.environment.VERSION;
                this['helpURL'] = 'http://help.keyman.com/go';
                this.setInitialized(0);
                // Signals that a KMW load has occurred in order to prevent double-loading.
                this['loaded'] = true;
            }
            ;
            // Stub functions (defined later in code only if required)
            KeymanBase.prototype.setDefaultDeviceOptions = function (opt) { };
            KeymanBase.prototype.getStyleSheetPath = function (s) { return s; };
            KeymanBase.prototype.getKeyboardPath = function (f, p) { return f; };
            KeymanBase.prototype.KC_ = function (n, ln, Pelem) { return ''; };
            KeymanBase.prototype.handleRotationEvents = function () { };
            // Will serve as an API function for a workaround, in case of future touch-alignment issues.
            KeymanBase.prototype['alignInputs'] = function (eleList) { };
            KeymanBase.prototype.hideInputs = function () { };
            ;
            KeymanBase.prototype.namespaceID = function (Pstub) { };
            ;
            KeymanBase.prototype.preserveID = function (Pk) { };
            ;
            KeymanBase.prototype.setInitialized = function (val) {
                this.initialized = this['initialized'] = val;
            };
            KeymanBase.prototype.delayedInit = function () {
                // Track the selected Event-handling object.
                this.touchAliasing = this.util.device.touchable ? this.domManager.touchHandlers : this.domManager.nonTouchHandlers;
            };
            /**
             * Triggers a KeymanWeb engine shutdown to facilitate a full system reset.
             * This function is designed for use with KMW unit-testing, which reloads KMW
             * multiple times to test the different initialization paths.
             */
            KeymanBase.prototype['shutdown'] = function () {
                this.domManager.shutdown();
                this.osk.shutdown();
                this.util.shutdown();
                this.keyboardManager.shutdown();
                if (this.ui && this.ui.shutdown) {
                    this.ui.shutdown();
                }
                keyman.DOMEventHandlers.states = new keyman.CommonDOMStates();
            };
            /**
             * Expose font testing to allow checking that SpecialOSK or custom font has
             * been correctly loaded by browser
             *
             *  @param  {string}  fName   font-family name
             *  @return {boolean}         true if available
             **/
            KeymanBase.prototype['isFontAvailable'] = function (fName) {
                return this.util.checkFont({ 'family': fName });
            };
            /**
             * Function     addEventListener
             * Scope        Public
             * @param       {string}            event     event to handle
             * @param       {function(Event)}   func      event handler function
             * @return      {boolean}                     value returned by util.addEventListener
             * Description  Wrapper function to add and identify KeymanWeb-specific event handlers
             */
            KeymanBase.prototype['addEventListener'] = function (event, func) {
                return this.util.addEventListener('kmw.' + event, func);
            };
            /**
           * Function     _GetEventObject
           * Scope        Private
           * @param       {Event=}     e     Event object if passed by browser
           * @return      {Event|null}       Event object
           * Description Gets the event object from the window when using Internet Explorer
           *             and handles getting the event correctly in frames
           */
            KeymanBase.prototype._GetEventObject = function (e) {
                if (!e) {
                    e = window.event;
                    if (!e) {
                        var elem = this.domManager.getLastActiveElement();
                        if (elem) {
                            elem = elem.ownerDocument;
                            var win;
                            if (elem) {
                                win = elem.defaultView;
                            }
                            if (!win) {
                                return null;
                            }
                            e = win.event;
                        }
                    }
                }
                return e;
            };
            /**
             * Function     _push
             * Scope        Private
             * @param       {Array}     Parray    Array
             * @param       {*}         Pval      Value to be pushed or appended to array
             * @return      {Array}               Returns extended array
             * Description  Push (if possible) or append a value to an array
             */
            KeymanBase.prototype._push = function (Parray, Pval) {
                if (Parray.push) {
                    Parray.push(Pval);
                }
                else {
                    Parray = Parray.concat(Pval);
                }
                return Parray;
            };
            // Base object API definitions
            /**
             * Function     attachToControl
             * Scope        Public
             * @param       {Element}    Pelem       Element to which KMW will be attached
             * Description  Attaches KMW to control (or IFrame)
             */
            KeymanBase.prototype['attachToControl'] = function (Pelem) {
                this.domManager.attachToControl(Pelem);
            };
            /**
             * Function     detachFromControl
             * Scope        Public
             * @param       {Element}    Pelem       Element from which KMW will detach
             * Description  Detaches KMW from a control (or IFrame)
             */
            KeymanBase.prototype['detachFromControl'] = function (Pelem) {
                this.domManager.detachFromControl(Pelem);
            };
            /**
             * Exposed function to load keyboards by name. One or more arguments may be used
             *
             * @param {string|Object} x keyboard name string or keyboard metadata JSON object
             *
             */
            KeymanBase.prototype['addKeyboards'] = function (x) {
                if (arguments.length == 0) {
                    this.keyboardManager.keymanCloudRequest('', false);
                }
                else {
                    this.keyboardManager.addKeyboardArray(arguments);
                }
            };
            /**
             *  Add default or all keyboards for a given language
             *
             *  @param  {string}   arg    Language name (multiple arguments allowed)
             **/
            KeymanBase.prototype['addKeyboardsForLanguage'] = function (arg) {
                this.keyboardManager.addLanguageKeyboards(arguments);
            };
            /**
             * Call back from cloud for adding keyboard metadata
             *
             * @param {Object}    x   metadata object
             **/
            KeymanBase.prototype['register'] = function (x) {
                this.keyboardManager.register(x);
            };
            /**
             * Build 362: removeKeyboards() remove keyboard from list of available keyboards
             *
             * @param {string} x keyboard name string
             *
             */
            KeymanBase.prototype['removeKeyboards'] = function (x) {
                return this.keyboardManager.removeKeyboards(x);
            };
            /**
             * Allow to change active keyboard by (internal) keyboard name
             *
             * @param       {string}    PInternalName   Internal name
             * @param       {string}    PLgCode         Language code
             */
            KeymanBase.prototype['setActiveKeyboard'] = function (PInternalName, PLgCode) {
                return this.keyboardManager.setActiveKeyboard(PInternalName, PLgCode);
            };
            /**
             * Function     getActiveKeyboard
             * Scope        Public
             * @return      {string}      Name of active keyboard
             * Description  Return internal name of currently active keyboard
             */
            KeymanBase.prototype['getActiveKeyboard'] = function () {
                return this.keyboardManager.getActiveKeyboardName();
            };
            /**
             * Function    getActiveLanguage
             * Scope       Public
             * @return     {string}         language code
             * Description Return language code for currently selected language
             */
            KeymanBase.prototype['getActiveLanguage'] = function () {
                return this.keyboardManager.getActiveLanguage();
            };
            KeymanBase.prototype['isAttached'] = function (x) {
                return this.domManager.isAttached(x);
            };
            /**
             * Function    isCJK
             * Scope       Public
             * @param      {Object=}  k0
             * @return     {boolean}
             * Description Tests if active keyboard (or optional argument) uses a pick list (Chinese, Japanese, Korean, etc.)
             *             (This function accepts either keyboard structure.)
             */
            KeymanBase.prototype['isCJK'] = function (k0) {
                return this.keyboardManager.isCJK(k0);
            };
            /**
             * Function     isChiral
             * Scope        Public
             * @param       {string|Object=}   k0
             * @return      {boolean}
             * Description  Tests if the active keyboard (or optional argument) uses chiral modifiers.
             */
            KeymanBase.prototype['isChiral'] = function (k0) {
                return this.keyboardManager.isChiral(k0);
            };
            /**
             * Get keyboard meta data for the selected keyboard and language
             *
             * @param       {string}    PInternalName     Internal name of keyboard
             * @param       {string=}   PlgCode           language code
             * @return      {Object}                      Details of named keyboard
             *
             **/
            KeymanBase.prototype['getKeyboard'] = function (PInternalName, PlgCode) {
                var Ln, Lrn;
                var kbdList = this.keyboardManager.getDetailedKeyboards();
                for (Ln = 0; Ln < kbdList.length; Ln++) {
                    Lrn = kbdList[Ln];
                    if (Lrn['InternalName'] == PInternalName || Lrn['InternalName'] == "Keyboard_" + PInternalName) {
                        if (arguments.length < 2) {
                            return Lrn;
                        }
                        if (Lrn['LanguageCode'] == PlgCode) {
                            return Lrn;
                        }
                    }
                }
                return null;
            };
            /**
             * Get array of available keyboard stubs
             *
             * @return   {Array}     Array of available keyboards
             *
             */
            KeymanBase.prototype['getKeyboards'] = function () {
                return this.keyboardManager.getDetailedKeyboards();
            };
            /**
             * Gets the cookie for the name and language code of the most recently active keyboard
             *
             *  Defaults to US English, but this needs to be user-set in later revision (TODO)
             *
             * @return      {string}          InternalName:LanguageCode
             */
            KeymanBase.prototype['getSavedKeyboard'] = function () {
                return this.keyboardManager.getSavedKeyboard();
            };
            /**
             * Function     Initialization
             * Scope        Public
             * @param       {Object}  arg     object array of user-defined properties
             * Description  KMW window initialization
             */
            KeymanBase.prototype['init'] = function (arg) {
                return this.domManager.init(arg);
            };
            /**
             * Function     resetContext
             * Scope        Public
             * Description  Revert OSK to default layer and clear any deadkeys and modifiers
             */
            KeymanBase.prototype['resetContext'] = function () {
                this.interface.resetContext();
            };
            ;
            /**
             * Function     setNumericLayer
             * Scope        Public
             * Description  Set OSK to numeric layer if it exists
             */
            KeymanBase.prototype['setNumericLayer'] = function () {
                this.interface.setNumericLayer();
            };
            ;
            /**
             * Function     disableControl
             * Scope        Public
             * @param       {Element}      Pelem       Element to be disabled
             * Description  Disables a KMW control element
             */
            KeymanBase.prototype['disableControl'] = function (Pelem) {
                this.domManager.disableControl(Pelem);
            };
            /**
             * Function     enableControl
             * Scope        Public
             * @param       {Element}      Pelem       Element to be disabled
             * Description  Disables a KMW control element
             */
            KeymanBase.prototype['enableControl'] = function (Pelem) {
                this.domManager.enableControl(Pelem);
            };
            /**
             * Function     setKeyboardForControl
             * Scope        Public
             * @param       {Element}    Pelem    Control element
             * @param       {string|null=}    Pkbd     Keyboard (Clears the set keyboard if set to null.)
             * @param       {string|null=}     Plc      Language Code
             * Description  Set default keyboard for the control
             */
            KeymanBase.prototype['setKeyboardForControl'] = function (Pelem, Pkbd, Plc) {
                this.domManager.setKeyboardForControl(Pelem, Pkbd, Plc);
            };
            /**
             * Function     getKeyboardForControl
             * Scope        Public
             * @param       {Element}    Pelem    Control element
             * @return      {string|null}         The independently-managed keyboard for the control.
             * Description  Returns the keyboard ID of the current independently-managed keyboard for this control.
             *              If it is currently following the global keyboard setting, returns null instead.
             */
            KeymanBase.prototype['getKeyboardForControl'] = function (Pelem) {
                this.domManager.getKeyboardForControl(Pelem);
            };
            /**
             * Function     getLanguageForControl
             * Scope        Public
             * @param       {Element}    Pelem    Control element
             * @return      {string|null}         The independently-managed keyboard for the control.
             * Description  Returns the language code used with the current independently-managed keyboard for this control.
             *              If it is currently following the global keyboard setting, returns null instead.
             */
            KeymanBase.prototype['getLanguageForControl'] = function (Pelem) {
                this.domManager.getLanguageForControl(Pelem);
            };
            /**
             * Set focus to last active target element (browser-dependent)
             */
            KeymanBase.prototype['focusLastActiveElement'] = function () {
                this.domManager.focusLastActiveElement();
            };
            /**
             * Get the last active target element *before* KMW activated (I1297)
             *
             * @return      {Object}
             */
            KeymanBase.prototype['getLastActiveElement'] = function () {
                return this.domManager.getLastActiveElement();
            };
            /**
             *  Set the active input element directly optionally setting focus
             *
             *  @param  {Object|string} e         element id or element
             *  @param  {boolean=}      setFocus  optionally set focus  (KMEW-123)
             **/
            KeymanBase.prototype['setActiveElement'] = function (e, setFocus) {
                return this.domManager.setActiveElement(e, setFocus);
            };
            /**
             * Move focus to user-specified element
             *
             *  @param  {string|Object}   e   element or element id
             *
             **/
            KeymanBase.prototype['moveToElement'] = function (e) {
                this.domManager.moveToElement(e);
            };
            /**
             * Function     addHotkey
             * Scope        Public
             * @param       {number}            keyCode
             * @param       {number}            shiftState
             * @param       {function(Object)}  handler
             * Description  Add hot key handler to array of document-level hotkeys triggered by key up event
             */
            KeymanBase.prototype['addHotKey'] = function (keyCode, shiftState, handler) {
                this.hotkeyManager.addHotKey(keyCode, shiftState, handler);
            };
            /**
             * Function     removeHotkey
             * Scope        Public
             * @param       {number}        keyCode
             * @param       {number}        shiftState
             * Description  Remove a hot key handler from array of document-level hotkeys triggered by key up event
             */
            KeymanBase.prototype['removeHotKey'] = function (keyCode, shiftState) {
                this.hotkeyManager.removeHotkey(keyCode, shiftState);
            };
            /**
             * Function     getUIState
             * Scope        Public
             * @return      {Object.<string,(boolean|number)>}
             * Description  Return object with activation state of UI:
             *                activationPending (bool):   KMW being activated
             *                activated         (bool):   KMW active
             */
            KeymanBase.prototype['getUIState'] = function () {
                return this.uiManager.getUIState();
            };
            /**
             * Set or clear the IsActivatingKeymanWebUI flag (exposed function)
             *
             * @param       {(boolean|number)}  state  Activate (true,false)
             */
            KeymanBase.prototype['activatingUI'] = function (state) {
                this.uiManager.setActivatingUI(state);
            };
            return KeymanBase;
        }());
        keyman.KeymanBase = KeymanBase;
    })(keyman = com.keyman || (com.keyman = {}));
})(com || (com = {}));
/**
 * Determine path and protocol of executing script, setting them as
 * construction defaults.
 *
 * This can only be done during load when the active script will be the
 * last script loaded.  Otherwise the script must be identified by name.
*/
var scripts = document.getElementsByTagName('script');
var ss = scripts[scripts.length - 1].src;
var sPath = ss.substr(0, ss.lastIndexOf('/') + 1);
var KeymanBase = com.keyman.KeymanBase;
KeymanBase._srcPath = sPath;
KeymanBase._rootPath = sPath.replace(/(https?:\/\/)([^\/]*)(.*)/, '$1$2/');
KeymanBase._protocol = sPath.replace(/(.{3,5}:)(.*)/, '$1');
/** @define {number} build counter that gets set by the build environment */
KeymanBase.__BUILD__ = 299;
/**
 * Base code: Declare major component namespaces, instances, and utility functions
 */
// If a copy of the script is already loaded, detect this and prevent re-initialization / data reset.
if (!window['keyman'] || !window['keyman']['loaded']) {
    (function () {
        /* The base object call may need to be moved into a separate, later file eventually.
         * It will be necessary to override methods with kmwnative.ts and kmwembedded.ts before the
         * affected objects are initialized.
         *
         * We only recreate the 'keyman' object if it's not been loaded.
         * As this is the base object, not creating it prevents a KMW system reset.
         */
        var keymanweb = window['keyman'] = new KeymanBase();
        // Define public OSK, user interface and utility function objects 
        var osk = keymanweb['osk'];
        var ui = keymanweb['ui'] = {};
        osk.highlightSubKeys = function (k, x, y) { };
        osk.createKeyTip = function () { };
        osk.optionKey = function (e, keyName, keyDown) { };
        osk.showKeyTip = function (key, on) { };
        osk.waitForFonts = function (kfd, ofd) { return true; };
    })();
}
// Includes KMW-added property declaration extensions for HTML elements.
/// <reference path="kmwexthtml.ts" />
// Includes KMW string extension declarations.
/// <reference path="kmwstring.ts" />
// Includes type definitions for basic KMW types.
/// <reference path="kmwtypedefs.ts" />
/***
   KeymanWeb 11.0
   Copyright 2019 SIL International
***/
// If KMW is already initialized, the KMW script has been loaded more than once. We wish to prevent resetting the 
// KMW system, so we use the fact that 'initialized' is only 1 / true after all scripts are loaded for the initial
// load of KMW.
if (!window['keyman']['initialized']) {
    // Continued KeymanWeb initialization.
    (function () {
        // Declare KeymanWeb, OnScreen Keyboard and Util object variables
        var keymanweb = window['keyman'], osk = keymanweb['osk'], util = keymanweb['util'], device = util.device;
        var kbdInterface = keymanweb['interface'];
        /**
         * Function     debug
         * Scope        Private
         * @param       {(string|Object)}     s   string (or object) to print
         * Description  Simple debug display (upper right of screen)
         *              Extended to support multiple arguments May 2015
         */
        keymanweb['debug'] = keymanweb.debug = function (s) {
            var p;
            if (keymanweb.debugElement == null) {
                var d = document.createElement('DIV'), ds = d.style;
                ds.position = 'absolute';
                ds.width = '30%';
                ds.maxHeight = '50%';
                ds.top = '0';
                ds.right = '0';
                ds.minHeight = '50px';
                ds.border = '1px solid blue';
                ds.whiteSpace = 'pre-line';
                ds.overflowY = 'scroll';
                p = document.createElement('P');
                p.id = 'debug_output';
                p.style.margin = '2px';
                d.appendChild(p);
                document.body.appendChild(d);
                keymanweb.debugElement = p;
            }
            if ((p = document.getElementById('debug_output')) == null)
                return;
            if (arguments.length == 0)
                if (typeof p.textContent != 'undefined')
                    p.textContent = '';
                else
                    p.innerHTML = '';
            else {
                var ts = new Date().toTimeString().substr(3, 5), t = ts + ' ', t1, k, m, sx;
                for (k = 0; k < arguments.length; k++) {
                    if (k > 0)
                        t = t + '; ';
                    sx = arguments[k];
                    if (typeof sx == 'object') {
                        if (sx == null) {
                            t = t + 'null';
                        }
                        else {
                            t1 = '';
                            for (m in sx) {
                                if (t1.length > 0)
                                    t1 = t1 + ', ';
                                t1 = t1 + m + ':';
                                switch (typeof sx[m]) {
                                    case 'string':
                                    case 'number':
                                    case 'boolean':
                                        t1 = t1 + sx[m];
                                        break;
                                    default:
                                        t1 = t1 + typeof sx[m];
                                        break;
                                }
                                if (t1.length > 1024) {
                                    t1 = t1.substr(0, 1000) + '...';
                                    break;
                                }
                            }
                            if (t1.length > 0)
                                t = t + '{' + t1 + '}';
                        }
                    }
                    else {
                        t = t + sx;
                    }
                }
                // Truncate if necessary to avoid memory problems
                if (t.length > 1500)
                    t = t.substr(0, 1500) + ' (more)';
                if (typeof p.textContent != 'undefined')
                    p.textContent = t + '\n' + p.textContent;
                else
                    p.innerHTML = t + '<br />' + p.innerHTML;
            }
        };
        /*
         * The following code existed here as part of the original pre-conversion JavaScript source, performing some inline initialization.
         * Ideally, this will be refactored once proper object-orientation of the codebase within TypeScript is complete.
         */
        keymanweb.debugElement = null;
        var dbg = keymanweb.debug;
        keymanweb.delayedInit();
        // I732 START - Support for European underlying keyboards #1
        if (typeof (window['KeymanWeb_BaseLayout']) !== 'undefined')
            osk._BaseLayout = window['KeymanWeb_BaseLayout'];
        else
            osk._BaseLayout = 'us';
        keymanweb._BrowserIsSafari = (navigator.userAgent.indexOf('AppleWebKit') >= 0); // I732 END - Support for European underlying keyboards #1      
        //TODO: find all references to next three routines and disambiguate!!
        // Complete page initialization only after the page is fully loaded, including any embedded fonts
        // This avoids the need to use a timer to test for the fonts
        util.attachDOMEvent(window, 'load', keymanweb.domManager._WindowLoad, false);
        util.attachDOMEvent(window, 'unload', keymanweb.domManager._WindowUnload, false); // added fourth argument (default value)       
        // *** I3319 Supplementary Plane modifications - end new code
        util.attachDOMEvent(document, 'keyup', keymanweb.hotkeyManager._Process, false);
        util.attachDOMEvent(window, 'focus', keymanweb.interface.resetVKShift.bind(keymanweb.interface), false); // I775
        util.attachDOMEvent(window, 'blur', keymanweb.interface.resetVKShift.bind(keymanweb.interface), false); // I775
        // Initialize supplementary plane string extensions
        String.kmwEnableSupplementaryPlane(false);
    })();
}
/// <reference path="kmwexthtml.ts" />  // Includes KMW-added property declaration extensions for HTML elements.
/// <reference path="kmwstring.ts" />  // Includes KMW string extension declarations.
var com;
(function (com) {
    var keyman;
    (function (keyman_6) {
        var OSKKeySpec = /** @class */ (function () {
            function OSKKeySpec(id, text, width, sp, nextlayer, pad) {
                this.id = id;
                this.text = text;
                this.width = width ? width : "50";
                this.sp = sp;
                this.nextlayer = nextlayer;
                this.pad = pad;
            }
            return OSKKeySpec;
        }());
        keyman_6.OSKKeySpec = OSKKeySpec;
        var OSKKey = /** @class */ (function () {
            function OSKKey(spec, layer) {
                this.spec = spec;
                this.layer = layer;
            }
            /**
             * Uses canvas.measureText to compute and return the width of the given text of given font in pixels.
             *
             * @param {String} text The text to be rendered.
             * @param {String} style The CSSStyleDeclaration for an element to measure against, without modification.
             *
             * @see https://stackoverflow.com/questions/118241/calculate-text-width-with-javascript/21015393#21015393
             * This version has been substantially modified to work for this particular application.
             */
            OSKKey.getTextWidth = function (text, style) {
                // A final fallback - having the right font selected makes a world of difference.
                if (!style.fontFamily) {
                    style.fontFamily = getComputedStyle(document.body).fontFamily;
                }
                if (!style.fontSize || style.fontSize == "") {
                    style.fontSize = '1em';
                }
                var fontFamily = style.fontFamily;
                // Use of `getComputedStyle` is ideal, but in many of our use cases its preconditions are not met.
                // The following allows us to calculate the font size in those situations.
                var emScale = window['keyman'].osk.getKeyEmFontSize();
                var fontSpec = window['keyman'].util.getFontSizeStyle(style.fontSize);
                var fontSize;
                if (fontSpec.absolute) {
                    // We've already got an exact size - use it!
                    fontSize = fontSpec.val + 'px';
                }
                else {
                    fontSize = fontSpec.val * emScale + 'px';
                }
                // re-use canvas object for better performance
                var canvas = OSKKey.getTextWidth['canvas'] || (OSKKey.getTextWidth['canvas'] = document.createElement("canvas"));
                var context = canvas.getContext("2d");
                context.font = fontSize + " " + fontFamily;
                var metrics = context.measureText(text);
                return metrics.width;
            };
            OSKKey.prototype.getKeyWidth = function () {
                var units = this.objectUnits();
                if (units == 'px') {
                    // For mobile devices, we presently specify width directly in pixels.  Just use that!
                    return this.spec['widthpc'];
                }
                else if (units == '%') {
                    // For desktop devices, each key is given a %age of the total OSK width.  We'll need to compute an
                    // approximation for that.  `osk._DivVkbd` is the element controlling the OSK's width, set in px.
                    // ... and since it's null whenever this method would be called during key construction, we simply
                    // grab it from the cookie (or its default values) instead.
                    var oskWidth = window['keyman'].osk.getWidthFromCookie();
                    // This is an approximation that tends to be a bit too large, but it's close enough to be useful.
                    return Math.floor(oskWidth * this.spec['widthpc'] / 100);
                }
            };
            OSKKey.prototype.objectUnits = function () {
                // Returns a unit string corresponding to how the width for each key is specified.
                if (window['keyman'].util.device.formFactor == 'desktop') {
                    return '%';
                }
                else {
                    return 'px';
                }
            };
            /**
             * Replace default key names by special font codes for modifier keys
             *
             *  @param  {string}  oldText
             *  @return {string}
             **/
            OSKKey.prototype.renameSpecialKey = function (oldText) {
                var keyman = window['keyman'];
                // If a 'special key' mapping exists for the text, replace it with its corresponding special OSK character.
                var specialCharacters = keyman['osk'].specialCharacters;
                return specialCharacters[oldText] ? String.fromCharCode(0XE000 + specialCharacters[oldText]) : oldText;
            };
            // Produces a HTMLSpanElement with the key's actual text.
            OSKKey.prototype.generateKeyText = function () {
                var util = window['keyman'].util;
                var spec = this.spec;
                // Add OSK key labels
                var keyText;
                var t = util._CreateElement('span'), ts = t.style;
                if (spec['text'] == null || spec['text'] == '') {
                    keyText = '\xa0'; // default:  nbsp.
                    if (typeof spec['id'] == 'string') {
                        // If the ID's Unicode-based, just use that code.
                        if (/^U_[0-9A-F]{4}$/i.test(spec['id'])) {
                            keyText = String.fromCharCode(parseInt(spec['id'].substr(2), 16));
                        }
                    }
                }
                else {
                    keyText = spec['text'];
                }
                t.className = 'kmw-key-text';
                // Use special case lookup for modifier keys
                if (spec['sp'] == '1' || spec['sp'] == '2') {
                    // Unique layer-based transformation.
                    var tId = ((spec['text'] == '*Tab*' && this.layer == 'shift') ? '*TabLeft*' : spec['text']);
                    // Transforms our *___* special key codes into their corresponding PUA character codes for keyboard display.
                    keyText = this.renameSpecialKey(tId);
                }
                // Grab our default for the key's font and font size.
                var osk = window['keyman'].osk;
                ts.fontSize = osk.fontSize; //Build 344, KMEW-90
                //Override font spec if set for this key in the layout
                if (typeof spec['font'] == 'string' && spec['font'] != '') {
                    ts.fontFamily = spec['font'];
                }
                if (typeof spec['fontsize'] == 'string' && spec['fontsize'] != 0) {
                    ts.fontSize = spec['fontsize'];
                }
                var keyboardManager = window['keyman'].keyboardManager;
                // For some reason, fonts will sometimes 'bug out' for the embedded iOS page if we
                // instead assign fontFamily to the existing style 'ts'.  (Occurs in iOS 12.)
                var styleSpec = { fontSize: ts.fontSize };
                if (ts.fontFamily) {
                    styleSpec.fontFamily = ts.fontFamily;
                }
                else {
                    styleSpec.fontFamily = osk.fontFamily; // Helps with style sheet calculations.
                }
                // Check the key's display width - does the key visualize well?
                var width = OSKKey.getTextWidth(keyText, styleSpec);
                if (width == 0 && keyText != '' && keyText != '\xa0') {
                    // Add the Unicode 'empty circle' as a base support for needy diacritics.
                    keyText = '\u25cc' + keyText;
                    if (keyboardManager.isRTL()) {
                        // Add the RTL marker to ensure it displays properly.
                        keyText = '\u200f' + keyText;
                    }
                    // Recompute the new width for use in autoscaling calculations below, just in case.
                    width = OSKKey.getTextWidth(keyText, styleSpec);
                }
                var fontSpec = util.getFontSizeStyle(ts.fontSize);
                var keyWidth = this.getKeyWidth();
                var maxProportion = 0.90;
                var proportion = (keyWidth * maxProportion) / width; // How much of the key does the text want to take?
                // Never upscale keys past the default - only downscale them.
                if (proportion < 1) {
                    if (fontSpec.absolute) {
                        ts.fontSize = proportion * fontSpec.val + 'px';
                    }
                    else {
                        ts.fontSize = proportion * fontSpec.val + 'em';
                    }
                }
                // Finalize the key's text.
                t.innerHTML = keyText;
                return t;
            };
            return OSKKey;
        }());
        keyman_6.OSKKey = OSKKey;
        var OSKBaseKey = /** @class */ (function (_super) {
            __extends(OSKBaseKey, _super);
            function OSKBaseKey(spec, layer) {
                return _super.call(this, spec, layer) || this;
            }
            OSKBaseKey.prototype.getId = function () {
                // Define each key element id by layer id and key id (duplicate possible for SHIFT - does it matter?)
                return this.layer + '-' + this.spec.id;
            };
            // Produces a small reference label for the corresponding physical key on a US keyboard.
            OSKBaseKey.prototype.generateKeyCapLabel = function () {
                // Create the default key cap labels (letter keys, etc.)
                var x = window['keyman']['osk'].keyCodes[this.spec.id];
                switch (x) {
                    // Converts the keyman key id code for common symbol keys into its representative ASCII code.
                    // K_COLON -> K_BKQUOTE
                    case 186:
                        x = 59;
                        break;
                    case 187:
                        x = 61;
                        break;
                    case 188:
                        x = 44;
                        break;
                    case 189:
                        x = 45;
                        break;
                    case 190:
                        x = 46;
                        break;
                    case 191:
                        x = 47;
                        break;
                    case 192:
                        x = 96;
                        break;
                    // K_LBRKT -> K_QUOTE
                    case 219:
                        x = 91;
                        break;
                    case 220:
                        x = 92;
                        break;
                    case 221:
                        x = 93;
                        break;
                    case 222:
                        x = 39;
                        break;
                    default:
                        // No other symbol character represents a base key on the standard QWERTY English layout.
                        if (x < 48 || x > 90) {
                            x = 0;
                        }
                }
                if (x > 0) {
                    var q = window['keyman'].util._CreateElement('div');
                    q.className = 'kmw-key-label';
                    q.innerHTML = String.fromCharCode(x);
                    return q;
                }
                else {
                    // Keyman-only virtual keys have no corresponding physical key.
                    return null;
                }
            };
            OSKBaseKey.prototype.processSubkeys = function (btn) {
                // Add reference to subkey array if defined
                var bsn, bsk = btn['subKeys'] = this.spec['sk'];
                // Transform any special keys into their PUA representations.
                for (bsn = 0; bsn < bsk.length; bsn++) {
                    if (bsk[bsn]['sp'] == '1' || bsk[bsn]['sp'] == '2') {
                        var oldText = bsk[bsn]['text'];
                        bsk[bsn]['text'] = this.renameSpecialKey(oldText);
                    }
                }
                // If a subkey array is defined, add an icon
                var skIcon = window['keyman'].util._CreateElement('div');
                skIcon.className = 'kmw-key-popup-icon';
                //kDiv.appendChild(skIcon);
                btn.appendChild(skIcon);
            };
            OSKBaseKey.prototype.construct = function (layout, rowStyle, totalPercent) {
                var util = window['keyman'].util;
                var osk = window['keyman'].osk;
                var spec = this.spec;
                var isDesktop = util.device.formFactor == 'desktop';
                var kDiv = util._CreateElement('div');
                kDiv['keyId'] = spec['id'];
                kDiv.className = 'kmw-key-square';
                var ks = kDiv.style;
                ks.width = this.objectGeometry(spec['widthpc']);
                var originalPercent = totalPercent;
                var btn = util._CreateElement('div');
                // Set button class
                osk.setButtonClass(spec, btn, layout);
                // Set key and button positioning properties.
                if (!isDesktop) {
                    // Regularize interkey spacing by rounding key width and padding (Build 390)
                    ks.left = this.objectGeometry(totalPercent + spec['padpc']);
                    ks.bottom = rowStyle.bottom;
                    ks.height = rowStyle.height; //must be specified in px for rest of layout to work correctly
                    // Set distinct phone and tablet button position properties
                    btn.style.left = ks.left;
                    btn.style.width = ks.width;
                }
                else {
                    ks.marginLeft = this.objectGeometry(spec['padpc']);
                }
                totalPercent = totalPercent + spec['padpc'] + spec['widthpc'];
                // Add the (US English) keycap label for desktop OSK or if KDU flag is non-zero
                if (layout.keyLabels || isDesktop) {
                    var keyCap = this.generateKeyCapLabel();
                    if (keyCap) {
                        btn.appendChild(keyCap);
                    }
                }
                // Define each key element id by layer id and key id (duplicate possible for SHIFT - does it matter?)
                btn.id = this.getId();
                // Keyman 12 goal:  convert btn['key'] to use the 'this' reference instead.
                btn['key'] = spec; //attach reference to key layout spec to element
                // Define callbacks to handle key touches: iOS and Android tablets and phones
                // TODO: replace inline function calls??
                if (!util.device.touchable) {
                    // Highlight key while mouse down or if moving back over originally selected key
                    btn.onmouseover = btn.onmousedown = osk.mouseOverMouseDownHandler; // Build 360
                    // Remove highlighting when key released or moving off selected element
                    btn.onmouseup = btn.onmouseout = osk.mouseUpMouseOutHandler; //Build 360
                }
                // Make sure the key text is the element's first child - processSubkeys()
                // will add an extra element if subkeys exist, which can interfere with
                // keyboard/language name display on the space bar!
                btn.appendChild(this.generateKeyText());
                // Handle subkey-related tasks.
                if (typeof (spec['sk']) != 'undefined' && spec['sk'] != null) {
                    this.processSubkeys(btn);
                }
                else {
                    btn['subKeys'] = null;
                }
                // Add text to button and button to placeholder div
                kDiv.appendChild(btn);
                // Prevent user selection of key captions
                //t.style.webkitUserSelect='none';
                // The 'return value' of this process.
                return { element: kDiv, percent: totalPercent - originalPercent };
            };
            OSKBaseKey.prototype.objectGeometry = function (v) {
                var unit = this.objectUnits();
                if (unit == '%') {
                    return v + unit;
                }
                else { // unit == 'px'
                    return Math.round(v) + unit;
                }
            };
            return OSKBaseKey;
        }(OSKKey));
        keyman_6.OSKBaseKey = OSKBaseKey;
        var OSKSubKey = /** @class */ (function (_super) {
            __extends(OSKSubKey, _super);
            function OSKSubKey(spec, layer) {
                return _super.call(this, spec, layer) || this;
            }
            OSKSubKey.prototype.getId = function () {
                var spec = this.spec;
                // Create (temporarily) unique ID by prefixing 'popup-' to actual key ID
                if (typeof (this.layer) == 'string' && this.layer != '') {
                    return 'popup-' + this.layer + '-' + spec['id'];
                }
                else {
                    // We only create subkeys when they're needed - the currently-active layer should be fine.
                    return 'popup-' + window['keyman'].osk.layerId + '-' + spec['id'];
                }
            };
            OSKSubKey.prototype.construct = function (baseKey, topMargin) {
                var osk = window['keyman'].osk;
                var spec = this.spec;
                var kDiv = document.createElement('div');
                var tKey = osk.getDefaultKeyObject();
                var ks = kDiv.style;
                for (var tp in tKey) {
                    if (typeof spec[tp] != 'string') {
                        spec[tp] = tKey[tp];
                    }
                }
                kDiv.className = 'kmw-key-square-ex';
                kDiv['keyId'] = spec['id'];
                if (topMargin) {
                    ks.marginTop = '5px';
                }
                if (typeof spec['width'] != 'undefined') {
                    ks.width = (parseInt(spec['width'], 10) * baseKey.offsetWidth / 100) + 'px';
                }
                else {
                    ks.width = baseKey.offsetWidth + 'px';
                }
                ks.height = baseKey.offsetHeight + 'px';
                var btn = document.createElement('div');
                osk.setButtonClass(spec, btn);
                btn.id = this.getId();
                // Plan for Keyman 12:  swap to use the 'this' reference.
                btn['key'] = spec;
                // Must set button size (in px) dynamically, not from CSS
                var bs = btn.style;
                bs.height = ks.height;
                bs.width = ks.width;
                // Must set position explicitly, at least for Android
                bs.position = 'absolute';
                btn.appendChild(this.generateKeyText());
                kDiv.appendChild(btn);
                return kDiv;
            };
            return OSKSubKey;
        }(OSKKey));
        keyman_6.OSKSubKey = OSKSubKey;
    })(keyman = com.keyman || (com.keyman = {}));
})(com || (com = {}));
/***
   KeymanWeb 11.0
   Copyright 2019 SIL International
***/
// If KMW is already initialized, the KMW script has been loaded more than once. We wish to prevent resetting the
// KMW system, so we use the fact that 'initialized' is only 1 / true after all scripts are loaded for the initial
// load of KMW.
if (!window['keyman']['initialized']) {
    /*****************************************/
    /*                                       */
    /*   On-Screen (Visual) Keyboard Code    */
    /*                                       */
    /*****************************************/
    (function () {
        // Declare KeymanWeb and member objects
        var keymanweb = window['keyman'], osk = keymanweb['osk'], util = keymanweb['util'], device = util.device, dbg = keymanweb.debug;
        var kbdInterface = keymanweb['interface'];
        // Define Keyman Developer modifier bit-flags (exposed for use by other modules)
        osk.modifierCodes = {
            "LCTRL": 0x0001,
            "RCTRL": 0x0002,
            "LALT": 0x0004,
            "RALT": 0x0008,
            "SHIFT": 0x0010,
            "CTRL": 0x0020,
            "ALT": 0x0040,
            "CAPS": 0x0100,
            "NO_CAPS": 0x0200,
            "NUM_LOCK": 0x0400,
            "NO_NUM_LOCK": 0x0800,
            "SCROLL_LOCK": 0x1000,
            "NO_SCROLL_LOCK": 0x2000,
            "VIRTUAL_KEY": 0x4000
        };
        osk.modifierBitmasks = {
            "ALL": 0x007F,
            "ALT_GR_SIM": (osk.modifierCodes['LCTRL'] | osk.modifierCodes['LALT']),
            "CHIRAL": 0x001F,
            "IS_CHIRAL": 0x000F,
            "NON_CHIRAL": 0x0070 // The default bitmask, for non-chiral keyboards
        };
        osk.stateBitmasks = {
            "ALL": 0x3F00,
            "CAPS": 0x0300,
            "NUM_LOCK": 0x0C00,
            "SCROLL_LOCK": 0x3000
        };
        // Define standard keycode numbers (exposed for use by other modules)
        osk.keyCodes = {
            "K_BKSP": 8, "K_TAB": 9, "K_ENTER": 13,
            "K_SHIFT": 16, "K_CONTROL": 17, "K_ALT": 18, "K_PAUSE": 19, "K_CAPS": 20,
            "K_ESC": 27, "K_SPACE": 32, "K_PGUP": 33,
            "K_PGDN": 34, "K_END": 35, "K_HOME": 36, "K_LEFT": 37, "K_UP": 38,
            "K_RIGHT": 39, "K_DOWN": 40, "K_SEL": 41, "K_PRINT": 42, "K_EXEC": 43,
            "K_INS": 45, "K_DEL": 46, "K_HELP": 47, "K_0": 48,
            "K_1": 49, "K_2": 50, "K_3": 51, "K_4": 52, "K_5": 53, "K_6": 54, "K_7": 55,
            "K_8": 56, "K_9": 57, "K_A": 65, "K_B": 66, "K_C": 67, "K_D": 68, "K_E": 69,
            "K_F": 70, "K_G": 71, "K_H": 72, "K_I": 73, "K_J": 74, "K_K": 75, "K_L": 76,
            "K_M": 77, "K_N": 78, "K_O": 79, "K_P": 80, "K_Q": 81, "K_R": 82, "K_S": 83,
            "K_T": 84, "K_U": 85, "K_V": 86, "K_W": 87, "K_X": 88, "K_Y": 89, "K_Z": 90,
            "K_NP0": 96, "K_NP1": 97, "K_NP2": 98,
            "K_NP3": 99, "K_NP4": 100, "K_NP5": 101, "K_NP6": 102,
            "K_NP7": 103, "K_NP8": 104, "K_NP9": 105, "K_NPSTAR": 106,
            "K_NPPLUS": 107, "K_SEPARATOR": 108, "K_NPMINUS": 109, "K_NPDOT": 110,
            "K_NPSLASH": 111, "K_F1": 112, "K_F2": 113, "K_F3": 114, "K_F4": 115,
            "K_F5": 116, "K_F6": 117, "K_F7": 118, "K_F8": 119, "K_F9": 120,
            "K_F10": 121, "K_F11": 122, "K_F12": 123, "K_NUMLOCK": 144, "K_SCROLL": 145,
            "K_LSHIFT": 160, "K_RSHIFT": 161, "K_LCONTROL": 162, "K_RCONTROL": 163,
            "K_LALT": 164, "K_RALT": 165,
            "K_COLON": 186, "K_EQUAL": 187, "K_COMMA": 188, "K_HYPHEN": 189,
            "K_PERIOD": 190, "K_SLASH": 191, "K_BKQUOTE": 192,
            "K_LBRKT": 219, "K_BKSLASH": 220, "K_RBRKT": 221,
            "K_QUOTE": 222, "K_oE2": 226,
            "K_LOPT": 50001, "K_ROPT": 50002,
            "K_NUMERALS": 50003, "K_SYMBOLS": 50004, "K_CURRENCIES": 50005,
            "K_UPPER": 50006, "K_LOWER": 50007, "K_ALPHA": 50008,
            "K_SHIFTED": 50009, "K_ALTGR": 50010,
            "K_TABBACK": 50011, "K_TABFWD": 50012
        };
        // Cross-reference with the ids in osk.setButtonClass.
        osk.buttonClasses = {
            'DEFAULT': '0',
            'SHIFT': '1',
            'SHIFT-ON': '2',
            'SPECIAL': '3',
            'SPECIAL-ON': '4',
            'DEADKEY': '8',
            'BLANK': '9',
            'HIDDEN': '10'
        };
        // Defines the PUA code mapping for the various 'special' modifier/control keys on keyboards.
        osk.specialCharacters = {
            '*Shift*': 8,
            '*Enter*': 5,
            '*Tab*': 6,
            '*BkSp*': 4,
            '*Menu*': 11,
            '*Hide*': 10,
            '*Alt*': 25,
            '*Ctrl*': 1,
            '*Caps*': 3,
            '*ABC*': 16,
            '*abc*': 17,
            '*123*': 19,
            '*Symbol*': 21,
            '*Currency*': 20,
            '*Shifted*': 8,
            '*AltGr*': 2,
            '*TabLeft*': 7,
            '*LAlt*': 0x56,
            '*RAlt*': 0x57,
            '*LCtrl*': 0x58,
            '*RCtrl*': 0x59,
            '*LAltCtrl*': 0x60,
            '*RAltCtrl*': 0x61,
            '*LAltCtrlShift*': 0x62,
            '*RAltCtrlShift*': 0x63,
            '*AltShift*': 0x64,
            '*CtrlShift*': 0x65,
            '*AltCtrlShift*': 0x66,
            '*LAltShift*': 0x67,
            '*RAltShift*': 0x68,
            '*LCtrlShift*': 0x69,
            '*RCtrlShift*': 0x70
        };
        osk.modifierSpecials = {
            'leftalt': '*LAlt*',
            'rightalt': '*RAlt*',
            'alt': '*Alt*',
            'leftctrl': '*LCtrl*',
            'rightctrl': '*RCtrl*',
            'ctrl': '*Ctrl*',
            'ctrl-alt': '*AltGr*',
            'leftctrl-leftalt': '*LAltCtrl*',
            'rightctrl-rightalt': '*RAltCtrl*',
            'leftctrl-leftalt-shift': '*LAltCtrlShift*',
            'rightctrl-rightalt-shift': '*RAltCtrlShift*',
            'shift': '*Shift*',
            'shift-alt': '*AltShift*',
            'shift-ctrl': '*CtrlShift*',
            'shift-ctrl-alt': '*AltCtrlShift*',
            'leftalt-shift': '*LAltShift*',
            'rightalt-shift': '*RAltShift*',
            'leftctrl-shift': '*LCtrlShift*',
            'rightctrl-shift': '*RCtrlShift*'
        };
        var codesUS = [['0123456789', ';=,-./`', '[\\]\''], [')!@#$%^&*(', ':+<_>?~', '{|}"']];
        var dfltCodes = ["K_BKQUOTE", "K_1", "K_2", "K_3", "K_4", "K_5", "K_6", "K_7", "K_8", "K_9", "K_0",
            "K_HYPHEN", "K_EQUAL", "K_*", "K_*", "K_*", "K_Q", "K_W", "K_E", "K_R", "K_T",
            "K_Y", "K_U", "K_I", "K_O", "K_P", "K_LBRKT", "K_RBRKT", "K_BKSLASH", "K_*",
            "K_*", "K_*", "K_A", "K_S", "K_D", "K_F", "K_G", "K_H", "K_J", "K_K", "K_L",
            "K_COLON", "K_QUOTE", "K_*", "K_*", "K_*", "K_*", "K_*", "K_oE2",
            "K_Z", "K_X", "K_C", "K_V", "K_B", "K_N", "K_M", "K_COMMA", "K_PERIOD",
            "K_SLASH", "K_*", "K_*", "K_*", "K_*", "K_*", "K_SPACE"];
        var dfltText = '`1234567890-=\xA7~~qwertyuiop[]\\~~~asdfghjkl;\'~~~~~?zxcvbnm,./~~~~~ '
            + '~!@#$%^&*()_+\xA7~~QWERTYUIOP{}\\~~~ASDFGHJKL:"~~~~~?ZXCVBNM<>?~~~~~ ';
        osk._Box = null; // Main DIV for OSK
        osk._DivVKbd = null;
        osk._DivVKbdHelp = null;
        osk._Visible = 0; // Whether or not actually visible
        osk._Enabled = 1; // Whether or not enabled by UI
        osk._VShift = [];
        osk._VKeySpans = [];
        osk._VKeyDown = null;
        osk._VKbdContainer = null;
        osk._VOriginalWidth = 1; // Non-zero default value needed
        osk._BaseLayout = 'us'; // default BaseLayout
        osk._BaseLayoutEuro = {}; // I1299 (not currently exposed, but may need to be e.g. for external users)
        osk._BaseLayoutEuro['se'] = '\u00a71234567890+´~~~QWERTYUIOP\u00c5\u00a8\'~~~ASDFGHJKL\u00d6\u00c4~~~~~<ZXCVBNM,.-~~~~~ '; // Swedish
        osk._BaseLayoutEuro['uk'] = '`1234567890-=~~~QWERTYUIOP[]#~~~ASDFGHJKL;\'~~~~~\\ZXCVBNM,./~~~~~ '; // UK
        // Tracks the OSK-based state of supported state keys.
        // Using the exact keyCode name from above allows for certain optimizations elsewhere in the code.
        osk._stateKeys = {
            "K_CAPS": false,
            "K_NUMLOCK": false,
            "K_SCROLL": false
        };
        // Additional members (mainly for touch input devices)
        osk.lgTimer = null; // language switching timer
        osk.lgKey = null; // language menu key element
        osk.hkKey = null; // OSK hide key element
        osk.spaceBar = null; // space bar key element
        osk.lgList = null; // language menu list
        osk.frameColor = '#ad4a28'; // KeymanWeb standard frame color
        osk.keyPending = null; // currently depressed key (if any)
        osk.fontFamily = ''; // layout-specified font for keyboard
        osk.fontSize = '1em'; // layout-specified fontsize for keyboard
        osk.layout = null; // reference to complete layout
        osk.layers = null; // reference to layout (layers array for this device)
        osk.layerId = 'default'; // currently active OSK layer (if any)
        osk.nextLayer = 'default'; // layer to be activated after pressing key in current layer
        osk.layerIndex = 0; // currently displayed layer index
        osk.currentKey = ''; // id of currently pressed key (desktop OSK only)
        osk.subkeyDelayTimer = null; // id for touch-hold delay timer
        osk.popupPending = false; // Device popup pending flag
        osk.popupVisible = false; // Device popup displayed
        osk.popupCallout = null; // OSK popup callout element
        osk.styleSheet = null; // current OSK style sheet object, if any
        osk.loadRetry = 0; // counter for delayed loading, if keyboard loading prevents OSK being ready at start
        osk.popupDelay = 500; // Delay must be less than native touch-hold delay (build 352)
        osk.currentTarget = null; // Keep track of currently touched key when moving over keyboard
        osk.touchCount = 0; // Number of active (unreleased) touch points
        osk.touchX = 0; // First touch point x (to check for sliding off screen)
        osk.deleting = 0; // Backspace repeat timer
        // Additional members for desktop OSK
        osk.x = 99; // last visible offset left
        osk.y = 0; // last visible offset top
        osk.width = 1; // Saved width of OSK (since actual width only available if visible)
        osk.height = 1; // Saved height of OSK
        osk.rowHeight = 1; // Current row height in px
        osk.nRows = 1; // Number of rows in each layer of current layout
        osk.vpScale = 1; // Current viewport scale factor  (not valid until initialized)
        osk.closeButton = null; // icon to hide OSK
        osk.resizeIcon = null; // resizing icon
        osk.resizing = 0; // resizing flag
        osk.pinImg = null; // icon to restore OSK to default position
        osk.userPositioned = 0; // Set to true(<>0) if dragged by user
        osk.dfltX = ''; // Left position set by page code
        osk.dfltY = ''; // Top position set by page code
        osk.noDrag = false; // allow page to override user OSK dragging
        osk.keytip = null; // Key preview (phones)
        osk.touchY = 0; // First y position of touched key
        // Placeholder functions
        osk.addCallout = function (e) { };
        osk.shutdown = function () {
            // Remove the OSK's elements from the document, allowing them to be properly cleaned up.
            // Necessary for clean engine testing.
            var _box = osk._Box;
            if (_box.parentElement) {
                _box.parentElement.removeChild(_box);
            }
        };
        /**
         * Function     addEventListener
         * Scope        Public
         * @param       {string}            event     event name
         * @param       {function(Object)}  func      event handler
         * @return      {boolean}
         * Description  Wrapper function to add and identify OSK-specific event handlers
         */
        osk['addEventListener'] = function (event, func) {
            return util.addEventListener('osk.' + event, func);
        };
        /**
         * Function     _TitleBarInterior
         * Scope        Private
         * Description  Title bar interior formatting and element event handling
         */
        osk._TitleBarInterior = function () {
            var Ldiv = util._CreateElement('DIV');
            var Ls = Ldiv.style;
            Ls.paddingLeft = '2px';
            Ls.cursor = 'move';
            Ls.background = '#ad4a28';
            Ls.font = '8pt Tahoma,Arial,sans-serif'; //I2186
            // Add container for buttons, handle mousedown event
            var LdivButtons = util._CreateElement('DIV');
            LdivButtons.className = 'kmw-title-bar-actions';
            LdivButtons.onmousedown = osk._CancelMouse;
            // Add close button, handle click and mousedown events
            var Limg = util._CreateElement('DIV');
            Limg.className = 'kmw-close-button';
            Limg.onmousedown = osk._CancelMouse;
            Limg.onclick = function () { osk._Hide(true); };
            osk.closeButton = Limg;
            LdivButtons.appendChild(Limg);
            /**
             * Move OSK back to default position
             */
            osk.restorePosition = function () {
                if (osk._Visible) {
                    keymanweb.domManager.focusLastActiveElement(); // I2036 - OSK does not unpin to correct location
                    osk.loadCookie();
                    osk.userPositioned = false;
                    osk.saveCookie();
                    osk._Show();
                    osk.doResizeMove(); //allow the UI to respond to OSK movements
                }
                if (osk.pinImg)
                    osk.pinImg.style.display = 'none';
                if (window.event)
                    window.event.returnValue = false;
            };
            // Add 'Unpin' button for restoring OSK to default location, handle mousedown and click events
            Limg = osk.pinImg = util._CreateElement('DIV'); //I2186
            Limg.className = 'kmw-pin-image';
            Limg.title = 'Pin the On Screen Keyboard to its default location on the active text box';
            Limg.onclick = osk.restorePosition;
            Limg.onmousedown = osk._CancelMouse;
            Limg.style.display = 'none';
            // Do not use Unpin button on touch screens (OSK location fixed)
            if (!device.touchable)
                LdivButtons.appendChild(Limg); // I3363 (Build 301)
            // Attach button container to title bar
            Ldiv.appendChild(LdivButtons);
            // Add title bar caption
            Limg = keymanweb._TitleElement = util._CreateElement('SPAN'); // I1972
            Limg.className = 'kmw-title-bar-caption';
            Limg.innerHTML = 'KeymanWeb';
            Ldiv.appendChild(Limg);
            return Ldiv;
        };
        // End of TitleBarInterior
        /**
         * Function     enabled
         * Scope        Public
         * @return      {boolean|number}    True if KMW OSK enabled
         * Description  Test if KMW OSK is enabled
         */
        osk['isEnabled'] = osk.isEnabled = function () {
            return osk._Enabled;
        };
        /**
         * Function     isVisible
         * Scope        Public
         * @return      {boolean|number}    True if KMW OSK visible
         * Description  Test if KMW OSK is actually visible
         * Note that this will usually return false after any UI event that results in (temporary) loss of input focus
         */
        osk['isVisible'] = osk.isVisible = function () {
            return osk._Visible;
        };
        /**
         * Function     getRect //TODO:  This is probably not correct, anyway!!!!!
         * Scope        Public
         * @return      {Object.<string,number>}   Array object with position and size of OSK container
         * Description  Get rectangle containing KMW Virtual Keyboard
         */
        osk['getRect'] = osk.getRect = function () {
            var p;
            p = {};
            if (osk._DivVKbd) {
                p['left'] = p.left = util._GetAbsoluteX(osk._DivVKbd);
                p['top'] = p.top = util._GetAbsoluteY(osk._DivVKbd);
                p['width'] = p.width = util._GetAbsoluteX(osk._DivVKbdHelp) - util._GetAbsoluteX(osk._DivVKbd) + osk._DivVKbdHelp.offsetWidth;
                p['height'] = p.height = util._GetAbsoluteY(osk._DivVKbdHelp) - util._GetAbsoluteY(osk._DivVKbd) + osk._DivVKbdHelp.offsetHeight;
            }
            else {
                p['left'] = p.left = util._GetAbsoluteX(osk._Box);
                p['top'] = p.top = util._GetAbsoluteY(osk._Box);
                p['width'] = p.width = util._GetAbsoluteX(osk._Box) + osk._Box.offsetWidth;
                p['height'] = p.height = util._GetAbsoluteY(osk._Box) + osk._Box.offsetHeight;
            }
            return p;
        };
        /**
         * Allow the UI or page to set the position and size of the OSK
         * and (optionally) override user repositioning or sizing
         *
         * @param       {Object.<string,number>}   p  Array object with position and size of OSK container
        **/
        osk['setRect'] = osk.setRect = function (p) {
            var q = {};
            if (osk._Box == null || device.formFactor != 'desktop')
                return;
            var b = osk._Box, bs = b.style;
            if ('left' in p) {
                bs.left = (p['left'] - util._GetAbsoluteX(b) + b.offsetLeft) + 'px';
                osk.dfltX = bs.left;
            }
            if ('top' in p) {
                bs.top = (p['top'] - util._GetAbsoluteY(b) + b.offsetTop) + 'px';
                osk.dfltY = bs.top;
            }
            //Do not allow user resizing for non-standard keyboards (e.g. EuroLatin)
            if (osk._DivVKbd != null) {
                var d = osk._DivVKbd, ds = d.style;
                // Set width, but limit to reasonable value
                if ('width' in p) {
                    var w = (p['width'] - (b.offsetWidth - d.offsetWidth));
                    if (w < 0.2 * screen.width)
                        w = 0.2 * screen.width;
                    if (w > 0.9 * screen.width)
                        w = 0.9 * screen.width;
                    ds.width = w + 'px';
                    osk.width = w;
                }
                // Set height, but limit to reasonable value
                // This sets the default font size for the OSK in px, but that
                // can be modified at the key text level by setting
                // the font size in em in the kmw-key-text class
                if ('height' in p) {
                    var h = (p['height'] - (b.offsetHeight - d.offsetHeight));
                    if (h < 0.1 * screen.height)
                        h = 0.1 * screen.height;
                    if (h > 0.5 * screen.height)
                        h = 0.5 * screen.height;
                    ds.height = h + 'px';
                    ds.fontSize = (h / 8) + 'px';
                    osk.height = h;
                }
                // Fix or release user resizing
                if ('nosize' in p)
                    if (osk.resizeIcon)
                        osk.resizeIcon.style.display = (p['nosize'] ? 'none' : 'block');
            }
            // Fix or release user dragging
            if ('nomove' in p) {
                osk.noDrag = p['nomove'];
                if (osk.pinImg)
                    osk.pinImg.style.display = (p['nomove'] || !osk.userPositioned) ? 'none' : 'block';
            }
            // Save the user-defined OSK size
            osk.saveCookie();
        };
        osk.getKeyEmFontSize = function () {
            if (util.device.formFactor == 'desktop') {
                var kbdFontSize = osk.getFontSizeFromCookie();
                var keySquareScale = 0.8; // Set in kmwosk.css, is relative.
                return kbdFontSize * keySquareScale;
            }
            else {
                var emSizeStr = getComputedStyle(document.body).fontSize;
                var emSize = util.getFontSizeStyle(emSizeStr).val;
                var emScale = util.getFontSizeStyle(osk._Box).val;
                return emSize * emScale;
            }
        };
        /**
         * Get position of OSK window
         *
         * @return      {Object.<string,number>}     Array object with OSK window position
        **/
        osk.getPos = function () {
            var Lkbd = osk._Box, p = {
                left: osk._Visible ? Lkbd.offsetLeft : osk.x,
                top: osk._Visible ? Lkbd.offsetTop : osk.y
            };
            return p;
        };
        /**
         * Function     setPos
         * Scope        Private
         * @param       {Object.<string,number>}    p     Array object with OSK left, top
         * Description  Set position of OSK window, but limit to screen, and ignore if  a touch input device
         */
        osk['setPos'] = osk.setPos = function (p) {
            if (typeof (osk._Box) == 'undefined' || device.touchable)
                return; // I3363 (Build 301)
            if (osk.userPositioned) {
                var Px = p['left'], Py = p['top'];
                if (typeof (Px) != 'undefined') {
                    if (Px < -0.8 * osk._Box.offsetWidth)
                        Px = -0.8 * osk._Box.offsetWidth;
                    if (osk.userPositioned) {
                        osk._Box.style.left = Px + 'px';
                        osk.x = Px;
                    }
                }
                // May not be needed - vertical positioning is handled differently and defaults to input field if off screen
                if (typeof (Py) != 'undefined') {
                    if (Py < 0)
                        Py = 0;
                    if (osk.userPositioned) {
                        osk._Box.style.top = Py + 'px';
                        osk.y = Py;
                    }
                }
            }
            if (osk.pinImg)
                osk.pinImg.style.display = (osk.userPositioned ? 'block' : 'none');
        };
        /**
         * Function     _VKeyGetTarget
         * Scope        Private
         * @param       {Object}    e     OSK event
         * @return      {Object}          Target element for key in OSK
         * Description  Identify the OSK key clicked
         */
        osk._VKeyGetTarget = function (e) {
            var Ltarg;
            e = keymanweb._GetEventObject(e); // I2404 - Manage IE events in IFRAMEs
            Ltarg = util.eventTarget(e);
            if (Ltarg == null) {
                return null;
            }
            if (Ltarg.nodeType == 3) { // defeat Safari bug
                Ltarg = Ltarg.parentNode;
            }
            if (Ltarg.tagName == 'SPAN') {
                Ltarg = Ltarg.parentNode;
            }
            return Ltarg;
        };
        /**
         *  Add or remove a class from a keyboard key (when touched or clicked)
         *  or add a key preview for phone devices
         *
         *  @param    {Object}    key   key affected
         *  @param    {boolean}   on    add or remove highlighting
         **/
        osk.highlightKey = function (key, on) {
            // Do not change element class unless a key
            if (!key || (key.className == '') || (key.className.indexOf('kmw-key-row') >= 0))
                return;
            var classes = key.className, cs = ' kmw-key-touched';
            // For phones, use key preview rather than highlighting the key,
            // except for space, bksp, enter, shift and popup keys
            var usePreview = ((osk.keytip != null)
                && (classes.indexOf('kmw-key-shift') < 0)
                && (classes.indexOf('kmw-spacebar') < 0)
                && (key.id.indexOf('popup') < 0));
            if (usePreview) {
                osk.showKeyTip(key, on);
            }
            else {
                if (on && classes.indexOf(cs) < 0) {
                    key.className = classes + cs;
                    osk.showKeyTip(null, false); // Moved here by Serkan
                }
                else {
                    key.className = classes.replace(cs, '');
                }
            }
        };
        /**
         * Display touch-hold array of 'sub-keys' above the currently touched key
         * @param       {Object}    e      primary key element
         */
        osk.showSubKeys = function (e) {
            // Do not show subkeys if key already released
            if (osk.keyPending == null) {
                return;
            }
            // Create holder DIV for subkey array, and set styles.
            // A subkey array for Shift will only appear if extra layers exist
            // The holder is position:fixed, but the keys do not need to be, as no scrolling
            // is possible while the array is visible.  So it is simplest to let the keys have
            // position:static and display:inline-block
            var subKeys = document.createElement('DIV'), i, t, ts, t1, ts1, kDiv, ks, btn, bs;
            var tKey = osk.getDefaultKeyObject();
            subKeys.id = 'kmw-popup-keys';
            osk.popupBaseKey = e;
            // Does the popup array include the base key?   *** condition for phone only ***
            if (device.formFactor == 'phone') {
                osk.prependBaseKey(e);
            }
            var idx = e.id.split('-'), baseId = idx[idx.length - 1];
            var baseLayer = idx.length > 1 ? idx[0] : 'default'; // idx.length should always be > 1, but just in case.
            // If not, insert at start
            if (device.formFactor == 'phone' && e.subKeys[0].id != baseId) {
                var eCopy = { 'id': baseId, 'layer': '' };
                if (idx.length > 1) {
                    eCopy['layer'] = baseLayer;
                }
                for (i = 0; i < e.childNodes.length; i++) {
                    if (osk.hasClass(e.childNodes[i], 'kmw-key-text')) {
                        break;
                    }
                }
                if (i < e.childNodes.length) {
                    eCopy['text'] = e.childNodes[i].textContent;
                }
                e.subKeys.splice(0, 0, eCopy);
            }
            // Must set position dynamically, not in CSS
            var ss = subKeys.style;
            ss.bottom = (parseInt(e.style.bottom, 10) + parseInt(e.style.height, 10) + 4) + 'px';
            // Set key font according to layout, or defaulting to OSK font
            // (copied, not inherited, since OSK is not a parent of popup keys)
            ss.fontFamily = osk.fontFamily;
            // Copy the font size from the parent key, allowing for style inheritance
            ss.fontSize = util.getStyleValue(e, 'font-size');
            ss.visibility = 'hidden';
            var nKeys = e.subKeys.length, nRow, nRows, nCols;
            nRows = Math.min(Math.ceil(nKeys / 9), 2);
            nCols = Math.ceil(nKeys / nRows);
            if (nRows > 1) {
                ss.width = (nCols * e.offsetWidth + nCols * 5) + 'px';
            }
            // Add nested button elements for each sub-key
            for (i = 0; i < nKeys; i++) {
                var needsTopMargin = false;
                var nRow_1 = Math.floor(i / nCols);
                if (nRows > 1 && nRow_1 > 0) {
                    needsTopMargin = true;
                }
                var keyGenerator = new com.keyman.OSKSubKey(e.subKeys[i], baseLayer);
                var kDiv_1 = keyGenerator.construct(e, needsTopMargin);
                subKeys.appendChild(kDiv_1);
            }
            // Clear key preview if any
            osk.showKeyTip(null, false);
            // Otherwise append the touch-hold (subkey) array to the OSK
            osk._Box.appendChild(subKeys);
            // And correct its position with respect to that element
            ss = subKeys.style;
            var x = util._GetAbsoluteX(e) + 0.5 * (e.offsetWidth - subKeys.offsetWidth), y, xMax = (util.landscapeView() ? screen.height : screen.width) - subKeys.offsetWidth;
            if (x > xMax) {
                x = xMax;
            }
            if (x < 0) {
                x = 0;
            }
            ss.left = x + 'px';
            // Add the callout
            osk.popupCallout = osk.addCallout(e);
            // Make the popup keys visible
            ss.visibility = 'visible';
            // And add a filter to fade main keyboard
            subKeys.shim = document.createElement('DIV');
            subKeys.shim.id = 'kmw-popup-shim';
            osk._Box.appendChild(subKeys.shim);
            // Highlight the duplicated base key (if a phone)
            if (device.formFactor == 'phone') {
                var bk = subKeys.childNodes[0].firstChild;
                osk.keyPending = bk;
                osk.highlightKey(bk, true); //bk.className = bk.className+' kmw-key-touched';
            }
        };
        /**
         * Prepend the base key to the touch-hold key array (for phones)
         *
         * @param {Object}  e   base key object
         */
        osk.prependBaseKey = function (e) {
            if (e && typeof (e.id) != 'undefined') {
                //TODO: refactor this, it's pretty messy...
                var i, idx = e.id.split('-'), baseId = idx[idx.length - 1], layer = e['key'] && e['key']['layer'] ? e['key']['layer'] : (idx.length > 1 ? idx[0] : ''), sp = e['key'] && e['key']['sp'], nextlayer = e['key'] && e['key']['nextlayer'] ? e['key']['nextlayer'] : null;
                if (typeof e.subKeys != 'undefined' && e.subKeys.length > 0 && (e.subKeys[0].id != baseId || e.subKeys[0].layer != layer)) {
                    var eCopy = { 'id': baseId, 'layer': '', 'key': undefined };
                    if (layer != '') {
                        eCopy['layer'] = layer;
                    }
                    if (sp) {
                        eCopy['sp'] = sp;
                    }
                    if (nextlayer) {
                        eCopy['nextlayer'] = nextlayer;
                    }
                    for (i = 0; i < e.childNodes.length; i++) {
                        if (osk.hasClass(e.childNodes[i], 'kmw-key-text'))
                            break;
                    }
                    if (i < e.childNodes.length)
                        eCopy['text'] = e.childNodes[i].textContent;
                    e.subKeys.splice(0, 0, eCopy);
                }
            }
        };
        /**
         * @summary Look up a custom virtual key code in the virtual key code dictionary KVKD.  On first run, will build the dictionary.
         *
         * `VKDictionary` is constructed from the keyboard's `KVKD` member. This list is constructed
         * at compile-time and is a list of 'additional' virtual key codes, starting at 256 (i.e.
         * outside the range of standard virtual key codes). These additional codes are both
         * `[T_xxx]` and `[U_xxxx]` custom key codes from the Keyman keyboard language. However,
         * `[U_xxxx]` keys only generate an entry in `KVKD` if there is a corresponding rule that
         * is associated with them in the keyboard rules. If the `[U_xxxx]` key code is only
         * referenced as the id of a key in the touch layout, then it does not get an entry in
         * the `KVKD` property.
         *
         * @private
         * @param       {string}      keyName   custom virtual key code to lookup in the dictionary
         * @return      {number}                key code > 255 on success, or 0 if not found
         */
        osk.getVKDictionaryCode = function (keyName) {
            var activeKeyboard = keymanweb.keyboardManager.activeKeyboard;
            if (!activeKeyboard['VKDictionary']) {
                var a = [];
                if (typeof activeKeyboard['KVKD'] == 'string') {
                    // Build the VK dictionary
                    // TODO: Move the dictionary build into the compiler -- so compiler generates code such as following.  
                    // Makes the VKDictionary member unnecessary.
                    //       this.KVKD={"K_ABC":256,"K_DEF":257,...};
                    var s = activeKeyboard['KVKD'].split(' ');
                    for (var i = 0; i < s.length; i++) {
                        a[s[i].toUpperCase()] = i + 256; // We force upper-case since virtual keys should be case-insensitive.
                    }
                }
                activeKeyboard['VKDictionary'] = a;
            }
            var res = activeKeyboard['VKDictionary'][keyName.toUpperCase()];
            return res ? res : 0;
        };
        /**
         * Select the next keyboard layer for layer switching keys
         * The next layer will be determined from the key name unless otherwise specifed
         *
         *  @param  {string}                    keyName     key identifier
         *  @param  {number|string|undefined}   nextLayerIn optional next layer identifier
         *  @return {boolean}                               return true if keyboard layer changed
         */
        osk.selectLayer = function (keyName, nextLayerIn) {
            var nextLayer = arguments.length < 2 ? null : nextLayerIn;
            var isChiral = keymanweb.keyboardManager.isChiral();
            // Layer must be identified by name, not number (27/08/2015)
            if (typeof nextLayer == 'number')
                nextLayer = osk.getLayerId(nextLayer * 0x10);
            // Identify next layer, if required by key
            if (!nextLayer)
                switch (keyName) {
                    case 'K_LSHIFT':
                    case 'K_RSHIFT':
                    case 'K_SHIFT':
                        nextLayer = 'shift';
                        break;
                    case 'K_LCONTROL':
                    case 'K_LCTRL':
                        if (isChiral) {
                            nextLayer = 'leftctrl';
                            break;
                        }
                    case 'K_RCONTROL':
                    case 'K_RCTRL':
                        if (isChiral) {
                            nextLayer = 'rightctrl';
                            break;
                        }
                    case 'K_CTRL':
                        nextLayer = 'ctrl';
                        break;
                    case 'K_LMENU':
                    case 'K_LALT':
                        if (isChiral) {
                            nextLayer = 'leftalt';
                            break;
                        }
                    case 'K_RMENU':
                    case 'K_RALT':
                        if (isChiral) {
                            nextLayer = 'rightalt';
                            break;
                        }
                    case 'K_ALT':
                        nextLayer = 'alt';
                        break;
                    case 'K_ALTGR':
                        if (isChiral) {
                            nextLayer = 'leftctrl-rightalt';
                        }
                        else {
                            nextLayer = 'ctrl-alt';
                        }
                        break;
                    case 'K_CURRENCIES':
                    case 'K_NUMERALS':
                    case 'K_SHIFTED':
                    case 'K_UPPER':
                    case 'K_LOWER':
                    case 'K_SYMBOLS':
                        nextLayer = 'default';
                        break;
                }
            if (!nextLayer)
                return false;
            // Do not change layer unless needed (27/08/2015)
            if (nextLayer == osk.layerId && device.formFactor != 'desktop')
                return false;
            // Change layer and refresh OSK
            osk.updateLayer(nextLayer);
            osk._Show();
            return true;
        };
        /**
         * Get the default key string. If keyName is U_xxxxxx, use that Unicode codepoint.
         * Otherwise, lookup the  virtual key code (physical keyboard mapping)
         *
         * @param   {string}  keyName Name of the key
         * @param   {number}  n
         * @param   {number}  keyShiftState
         * @param   {boolean} usingOSK
         * @param   {Object=} Lelem
         * @return  {string}
         */
        osk.defaultKeyOutput = function (keyName, n, keyShiftState, usingOSK, Lelem) {
            var ch = '', checkCodes = false;
            var touchAlias = (Lelem && typeof (Lelem.base) != 'undefined');
            // check if exact match to SHIFT's code.  Only the 'default' and 'shift' layers should have default key outputs.
            if (keyShiftState == 0) {
                checkCodes = true;
            }
            else if (keyShiftState == osk.modifierCodes['SHIFT']) {
                checkCodes = true;
                keyShiftState = 1; // It's used as an index.
            }
            else {
                console.warn("KMW only defines default key output for the 'default' and 'shift' layers!");
            }
            // If this was triggered by the OSK -or- if it was triggered within a touch-aliased DIV element.
            if (touchAlias || usingOSK) {
                var code = osk.keyCodes[keyName];
                if (!code) {
                    code = n;
                }
                switch (code) {
                    case osk.keyCodes['K_BKSP']: //Only desktop UI, not touch devices. TODO: add repeat while mouse down for desktop UI
                        kbdInterface.defaultBackspace();
                        break;
                    case osk.keyCodes['K_TAB']:
                        keymanweb.domManager.moveToNext(keyShiftState);
                        break;
                    case osk.keyCodes['K_TABBACK']:
                        keymanweb.domManager.moveToNext(true);
                        break;
                    case osk.keyCodes['K_TABFWD']:
                        keymanweb.domManager.moveToNext(false);
                        break;
                    case osk.keyCodes['K_ENTER']:
                        // Insert new line in text area fields
                        if (Lelem.nodeName == 'TEXTAREA' || (typeof Lelem.base != 'undefined' && Lelem.base.nodeName == 'TEXTAREA')) {
                            return '\n';
                            // Or move to next field from TEXT fields
                        }
                        else if (usingOSK) {
                            if (Lelem.nodeName == 'INPUT' && (Lelem.type == 'search' || Lelem.type == 'submit')) {
                                Lelem.form.submit();
                            }
                            else if (typeof (Lelem.base) != 'undefined' && (Lelem.base.type == 'search' || Lelem.base.type == 'submit')) {
                                Lelem.base.disabled = false;
                                Lelem.base.form.submit();
                            }
                            else {
                                keymanweb.domManager.moveToNext(false);
                            }
                        }
                        break;
                    case osk.keyCodes['K_SPACE']:
                        return ' ';
                    // break;
                    //
                    // // Problem:  clusters, and doing them right.
                    // // The commented-out code below should be a decent starting point, but clusters make it complex.
                    //
                    // case osk.keyCodes['K_LEFT']:
                    //   if(touchAlias) {
                    //     var caretPos = keymanweb.getTextCaret(Lelem);
                    //     keymanweb.setTextCaret(Lelem, caretPos - 1 >= 0 ? caretPos - 1 : 0);
                    //   }
                    //   break;
                    // case osk.keyCodes['K_RIGHT']:
                    //   if(touchAlias) {
                    //     var caretPos = keymanweb.getTextCaret(Lelem);
                    //     keymanweb.setTextCaret(Lelem, caretPos + 1);
                    //   }
                    //   if(code == osk.keyCodes['K_RIGHT']) {
                    //     break;
                    //   }
                    // // Should we include this?  It could be tricky to do correctly...
                    // case osk.keyCodes['K_DEL']:
                    //   // Move caret right one unit, then backspace.
                    //   if(touchAlias) {
                    //     var caretPos = keymanweb.getTextCaret(Lelem);
                    //     keymanweb.setTextCaret(Lelem, caretPos + 1);
                    //     if(caretPos == keymanweb.getTextCaret(Lelem)) {
                    //       // Failed to move right - there's nothing to delete.
                    //       break;
                    //     }
                    //     kbdInterface.defaultBackspace();
                    //   }
                }
            }
            // TODO:  Refactor the overloading of the 'n' parameter here into separate methods.
            // Test for fall back to U_xxxxxx key id
            // For this first test, we ignore the keyCode and use the keyName
            if ((keyName.substr(0, 2) == 'U_')) {
                var codePoint = parseInt(keyName.substr(2, 6), 16);
                if (((0x0 <= codePoint) && (codePoint <= 0x1F)) || ((0x80 <= codePoint) && (codePoint <= 0x9F))) {
                    // Code points [U_0000 - U_001F] and [U_0080 - U_009F] refer to Unicode C0 and C1 control codes.
                    // Check the codePoint number and do not allow output of these codes via U_xxxxxx shortcuts.
                    console.log("Suppressing Unicode control code: U_00" + codePoint.toString(16));
                    return ch;
                }
                else {
                    // String.fromCharCode() is inadequate to handle the entire range of Unicode
                    // Someday after upgrading to ES2015, can use String.fromCodePoint()
                    ch = String.kmwFromCharCode(codePoint);
                }
                // Hereafter, we refer to keyCodes.
            }
            else if (checkCodes) { // keyShiftState can only be '1' or '2'.
                try {
                    if (n >= osk.keyCodes['K_0'] && n <= osk.keyCodes['K_9']) { // The number keys.
                        ch = codesUS[keyShiftState][0][n - osk.keyCodes['K_0']];
                    }
                    else if (n >= osk.keyCodes['K_A'] && n <= osk.keyCodes['K_Z']) { // The base letter keys
                        ch = String.fromCharCode(n + (keyShiftState ? 0 : 32)); // 32 is the offset from uppercase to lowercase.
                    }
                    else if (n >= osk.keyCodes['K_COLON'] && n <= osk.keyCodes['K_BKQUOTE']) {
                        ch = codesUS[keyShiftState][1][n - osk.keyCodes['K_COLON']];
                    }
                    else if (n >= osk.keyCodes['K_LBRKT'] && n <= osk.keyCodes['K_QUOTE']) {
                        ch = codesUS[keyShiftState][2][n - osk.keyCodes['K_LBRKT']];
                    }
                }
                catch (e) {
                    console.error("Error detected with default mapping for key:  code = " + n + ", shift state = " + (keyShiftState == 1 ? 'shift' : 'default'));
                }
            }
            return ch;
        };
        /**
         * Simulate a keystroke according to the touched keyboard button element
         *
         * Note that the test-case oriented 'recorder' stubs this method to facilitate OSK-based input
         * recording for use in test cases.  If changing this function, please ensure the recorder is
         * not affected.
         *
         * @param       {Object}      e      element touched (or clicked)
         */
        osk.clickKey = function (e) {
            var Lelem = keymanweb.domManager.getLastActiveElement(), Ls, Le, Lkc;
            var activeKeyboard = keymanweb.keyboardManager.activeKeyboard;
            // Each button id is of the form <layer>-<keyCode>, e.g. 'shift-ctrl-K_Q' or 'popup-shift-K_501', etc.
            var t = e.id.split('-');
            if (t.length < 2)
                return true; //shouldn't happen, but...
            // Remove popup prefix before processing keystroke (KMEW-93)
            if (t[0] == 'popup')
                t.splice(0, 1);
            if (Lelem != null) {
                // Get key name and keyboard shift state (needed only for default layouts and physical keyboard handling)
                // Note - virtual keys should be treated case-insensitive, so we force uppercasing here.
                var layer = t[0], keyName = t[t.length - 1].toUpperCase(), keyShiftState = osk.getModifierState(osk.layerId), nextLayer = keyShiftState;
                // Make sure to get the full current layer, since layers are now kebab-case.
                for (var i = 1; i < t.length - 1; i++) {
                    layer = layer + "-" + t[i];
                }
                if (typeof (e.key) != 'undefined')
                    nextLayer = e.key['nextlayer'];
                keymanweb.domManager.initActiveElement(Lelem);
                // Exclude menu and OSK hide keys from normal click processing
                if (keyName == 'K_LOPT' || keyName == 'K_ROPT') {
                    osk.optionKey(e, keyName, true);
                    return true;
                }
                // Turn off key highlighting (or preview)
                osk.highlightKey(e, false);
                // The default OSK layout for desktop devices does not include nextlayer info, relying on modifier detection here.
                if (device.formFactor == 'desktop') {
                    if (osk.selectLayer(keyName, nextLayer)) {
                        return true;
                    }
                }
                // Prevent any output from 'ghost' (unmapped) keys
                if (keyName != 'K_SPACE') {
                    var keyText = e.childNodes[0].innerHTML;
                    //// if(keyText == '' || keyText == '&nbsp;') return true; --> why?
                }
                Ls = Lelem._KeymanWebSelectionStart;
                Le = Lelem._KeymanWebSelectionEnd;
                keymanweb.uiManager.setActivatingUI(true);
                com.keyman.DOMEventHandlers.states._IgnoreNextSelChange = 100;
                keymanweb.domManager.focusLastActiveElement();
                if (keymanweb.domManager._IsMozillaEditableIframe(Lelem, 0))
                    Lelem = Lelem.documentElement;
                Lelem._KeymanWebSelectionStart = Ls;
                Lelem._KeymanWebSelectionEnd = Le;
                com.keyman.DOMEventHandlers.states._IgnoreNextSelChange = 0;
                // ...end I3363 (Build 301)
                keymanweb._CachedSelectionStart = null; // I3319
                // Deadkey matching continues to be troublesome.
                // Deleting matched deadkeys here seems to correct some of the issues.   (JD 6/6/14)
                kbdInterface._DeadkeyDeleteMatched(); // Delete any matched deadkeys before continuing
                //kbdInterface._DeadkeyResetMatched();       // I3318   (Not needed if deleted first?)
                // First check the virtual key, and process shift, control, alt or function keys
                Lkc = { Ltarg: Lelem, Lmodifiers: 0, Lstates: 0, Lcode: osk.keyCodes[keyName], LisVirtualKey: true };
                // Set the flags for the state keys.
                Lkc.Lstates |= osk._stateKeys['K_CAPS'] ? osk.modifierCodes['CAPS'] : osk.modifierCodes['NO_CAPS'];
                Lkc.Lstates |= osk._stateKeys['K_NUMLOCK'] ? osk.modifierCodes['NUM_LOCK'] : osk.modifierCodes['NO_NUM_LOCK'];
                Lkc.Lstates |= osk._stateKeys['K_SCROLL'] ? osk.modifierCodes['SCROLL_LOCK'] : osk.modifierCodes['NO_SCROLL_LOCK'];
                // Set LisVirtualKey to false to ensure that nomatch rule does fire for U_xxxx keys
                if (keyName.substr(0, 2) == 'U_')
                    Lkc.LisVirtualKey = false;
                // Get code for non-physical keys (T_KOKAI, U_05AB etc)
                if (typeof Lkc.Lcode == 'undefined') {
                    Lkc.Lcode = osk.getVKDictionaryCode(keyName); // Updated for Build 347
                    if (!Lkc.Lcode) {
                        // Special case for U_xxxx keys. This vk code will never be used
                        // in a keyboard, so we use this to ensure that keystroke processing
                        // occurs for the key.
                        Lkc.Lcode = 1;
                    }
                }
                // Override key shift state if specified for key in layout (corrected for popup keys KMEW-93)
                var lx = (typeof e.key == 'undefined' ? null : e.key['layer']);
                if (lx == null)
                    keyShiftState = osk.getModifierState(layer);
                else
                    keyShiftState = osk.getModifierState(lx);
                // Define modifiers value for sending to keyboard mapping function
                Lkc.Lmodifiers = keyShiftState;
                // Handles modifier states when the OSK is emulating rightalt through the leftctrl-leftalt layer.
                if ((Lkc.Lmodifiers & osk.modifierBitmasks['ALT_GR_SIM']) == osk.modifierBitmasks['ALT_GR_SIM'] && osk.emulatesAltGr()) {
                    Lkc.Lmodifiers &= ~osk.modifierBitmasks['ALT_GR_SIM'];
                    Lkc.Lmodifiers |= osk.modifierCodes['RALT'];
                }
                // Include *limited* support for mnemonic keyboards (Sept 2012)
                // If a touch layout has been defined for a mnemonic keyout, do not perform mnemonic mapping for rules on touch devices.
                if (activeKeyboard && activeKeyboard['KM'] && !(activeKeyboard['KVKL'] && device.formFactor != 'desktop')) {
                    if (Lkc.Lcode != osk.keyCodes['K_SPACE']) { // exception required, March 2013
                        Lkc.vkCode = Lkc.Lcode;
                        // So long as the key name isn't prefixed with 'U_', we'll get a default mapping based on the Lcode value.
                        // We need to determine the mnemonic base character - for example, SHIFT + K_PERIOD needs to map to '>'.
                        var mappedChar = osk.defaultKeyOutput('K_xxxx', Lkc.Lcode, (layer.indexOf('shift') != -1 ? 0x10 : 0), false, null);
                        if (mappedChar) {
                            Lkc.Lcode = mappedChar.charCodeAt(0);
                        } // No 'else' - avoid remapping control + modifier keys!
                        if (osk._stateKeys['K_CAPS']) {
                            if ((Lkc.Lcode >= 65 && Lkc.Lcode <= 90) /* 'A' - 'Z' */ || (Lkc.Lcode >= 97 && Lkc.Lcode <= 122) /* 'a' - 'z' */) {
                                Lkc.Lmodifiers ^= 0x10; // Flip the 'shift' bit.
                                Lkc.Lcode ^= 0x20; // Flips the 'upper' vs 'lower' bit for the base 'a'-'z' ASCII alphabetics.
                            }
                        }
                    }
                }
                else {
                    Lkc.vkCode = Lkc.Lcode;
                }
                // Support version 1.0 KeymanWeb keyboards that do not define positional vs mnemonic
                if (typeof activeKeyboard['KM'] == 'undefined') {
                    Lkc.Lcode = keymanweb.keyMapManager._USKeyCodeToCharCode(Lkc);
                    Lkc.LisVirtualKey = false;
                }
                // Pass this key code and state to the keyboard program
                if (!activeKeyboard || (Lkc.Lcode != 0 && !kbdInterface.processKeystroke(util.device, Lelem, Lkc))) {
                    // Restore the virtual key code if a mnemonic keyboard is being used
                    Lkc.Lcode = Lkc.vkCode;
                    // Handle unmapped keys, including special keys
                    switch (keyName) {
                        case 'K_CAPS':
                        case 'K_NUMLOCK':
                        case 'K_SCROLL':
                            osk._stateKeys[keyName] = !osk._stateKeys[keyName];
                            osk._Show();
                            break;
                        default:
                            // The following is physical layout dependent, so should be avoided if possible.  All keys should be mapped.
                            var ch = osk.defaultKeyOutput(keyName, Lkc.Lcode, keyShiftState, true, Lelem);
                            if (ch) {
                                kbdInterface.output(0, Lelem, ch);
                            }
                    }
                }
                // Test if this key has a non-default next layer
                if (typeof e.key != 'undefined' && e.key['nextlayer'] !== null)
                    osk.nextLayer = e.key['nextlayer'];
                // Swap layer as appropriate.
                osk.selectLayer(keyName, nextLayer);
                /* I732 END - 13/03/2007 MCD: End Positional Layout support in OSK */
                Lelem._KeymanWebSelectionStart = null;
                Lelem._KeymanWebSelectionEnd = null;
            }
            keymanweb.uiManager.setActivatingUI(false); // I2498 - KeymanWeb OSK does not accept clicks in FF when using automatic UI
            return true;
        };
        /**
         * Function     getLayerId
         * Scope        Private
         * @param       {number}      m     shift modifier code
         * @return      {string}            layer string from shift modifier code (desktop keyboards)
         * Description  Get name of layer from code, where the modifer order is determined by ascending bit-flag value.
         */
        osk.getLayerId = function (m) {
            var s = '';
            if (m == 0) {
                return 'default';
            }
            else {
                if (m & osk.modifierCodes['LCTRL']) {
                    s = (s.length > 0 ? s + '-' : '') + 'leftctrl';
                }
                if (m & osk.modifierCodes['RCTRL']) {
                    s = (s.length > 0 ? s + '-' : '') + 'rightctrl';
                }
                if (m & osk.modifierCodes['LALT']) {
                    s = (s.length > 0 ? s + '-' : '') + 'leftalt';
                }
                if (m & osk.modifierCodes['RALT']) {
                    s = (s.length > 0 ? s + '-' : '') + 'rightalt';
                }
                if (m & osk.modifierCodes['SHIFT']) {
                    s = (s.length > 0 ? s + '-' : '') + 'shift';
                }
                if (m & osk.modifierCodes['CTRL']) {
                    s = (s.length > 0 ? s + '-' : '') + 'ctrl';
                }
                if (m & osk.modifierCodes['ALT']) {
                    s = (s.length > 0 ? s + '-' : '') + 'alt';
                }
                return s;
            }
        };
        /**
         * Get modifier key state from layer id
         *
         * @param       {string}      layerId       layer id (e.g. ctrlshift)
         * @return      {number}                    modifier key state (desktop keyboards)
         */
        osk.getModifierState = function (layerId) {
            var modifier = 0;
            if (layerId.indexOf('shift') >= 0) {
                modifier |= osk.modifierCodes['SHIFT'];
            }
            // The chiral checks must not be directly exclusive due each other to visual OSK feedback.
            var ctrlMatched = false;
            if (layerId.indexOf('leftctrl') >= 0) {
                modifier |= osk.modifierCodes['LCTRL'];
                ctrlMatched = true;
            }
            if (layerId.indexOf('rightctrl') >= 0) {
                modifier |= osk.modifierCodes['RCTRL'];
                ctrlMatched = true;
            }
            if (layerId.indexOf('ctrl') >= 0 && !ctrlMatched) {
                modifier |= osk.modifierCodes['CTRL'];
            }
            var altMatched = false;
            if (layerId.indexOf('leftalt') >= 0) {
                modifier |= osk.modifierCodes['LALT'];
                altMatched = true;
            }
            if (layerId.indexOf('rightalt') >= 0) {
                modifier |= osk.modifierCodes['RALT'];
                altMatched = true;
            }
            if (layerId.indexOf('alt') >= 0 && !altMatched) {
                modifier |= osk.modifierCodes['ALT'];
            }
            return modifier;
        };
        /**
         * Sets the new layer id, allowing for toggling shift/ctrl/alt while preserving the remainder
         * of the modifiers represented by the current layer id (where applicable)
         *
         * @param       {string}      id      layer id (e.g. ctrlshift)
         */
        osk.updateLayer = function (id) {
            var s = osk.layerId, idx = id;
            var i;
            if (keymanweb.util.device.formFactor == 'desktop') {
                // Need to test if target layer is a standard layer (based on the plain 'default')
                var replacements = ['leftctrl', 'rightctrl', 'ctrl', 'leftalt', 'rightalt', 'alt', 'shift'];
                for (i = 0; i < replacements.length; i++) {
                    // Don't forget to remove the kebab-case hyphens!
                    idx = idx.replace(replacements[i] + '-', '');
                    idx = idx.replace(replacements[i], '');
                }
                // If we are presently on the default layer, drop the 'default' and go straight to the shifted mode.
                // If on a common symbolic layer, drop out of symbolic mode and go straight to the shifted mode.
                if (osk.layerId == 'default' || osk.layerId == 'numeric' || osk.layerId == 'symbol' || osk.layerId == 'currency' || idx != '') {
                    s = id;
                }
                // Otherwise, we are based upon the a layer that accepts modifier variations.
                // Modify the layer according to the current state and key pressed.
                //
                // TODO:  Consider:  should this ever be allowed for a base layer other than 'default'?  If not,
                // if(idx == '') with accompanying if-else structural shift would be a far better test here.
                else {
                    // Save our current modifier state.
                    var modifier = osk.getModifierState(s);
                    // Strip down to the base modifiable layer.
                    for (i = 0; i < replacements.length; i++) {
                        // Don't forget to remove the kebab-case hyphens!
                        s = s.replace(replacements[i] + '-', '');
                        s = s.replace(replacements[i], '');
                    }
                    // Toggle the modifier represented by our input argument.
                    switch (id) {
                        case 'shift':
                            modifier ^= osk.modifierCodes['SHIFT'];
                            break;
                        case 'leftctrl':
                            modifier ^= osk.modifierCodes['LCTRL'];
                            break;
                        case 'rightctrl':
                            modifier ^= osk.modifierCodes['RCTRL'];
                            break;
                        case 'ctrl':
                            modifier ^= osk.modifierCodes['CTRL'];
                            break;
                        case 'leftalt':
                            modifier ^= osk.modifierCodes['LALT'];
                            break;
                        case 'rightalt':
                            modifier ^= osk.modifierCodes['RALT'];
                            break;
                        case 'alt':
                            modifier ^= osk.modifierCodes['ALT'];
                            break;
                        default:
                            s = id;
                    }
                    // Combine our base modifiable layer and attach the new modifier variation info to obtain our destination layer.
                    if (s != 'default') {
                        if (s == '') {
                            s = osk.getLayerId(modifier);
                        }
                        else {
                            s = osk.getLayerId(modifier) + '-' + s;
                        }
                    }
                }
                if (s == '') {
                    s = 'default';
                }
            }
            else {
                // Mobile form-factor.  Either the layout is specified by a keyboard developer with direct layer name references
                // or all layers are accessed via subkey of a single layer-shifting key - no need for modifier-combining logic.
                s = id;
            }
            // Actually set the new layer id.
            osk.layerId = s;
            // Check that requested layer is defined   (KMEA-1, but does not resolve issue)
            for (i = 0; i < osk.layers.length; i++)
                if (osk.layerId == osk.layers[i].id)
                    return;
            // Show default layer if an undefined layer has been requested
            osk.layerId = 'default';
        };
        /**
         * Indicate the current language and keyboard on the space bar
         **/
        osk.showLanguage = function () {
            var lgName = '', kbdName = '';
            var activeStub = keymanweb.keyboardManager.activeStub;
            if (activeStub) {
                lgName = activeStub['KL'];
                kbdName = activeStub['KN'];
            }
            else if (keymanweb._ActiveLanguage) {
                lgName = keymanweb._ActiveLanguage['KN'];
            }
            else {
                lgName = 'English';
            }
            try {
                var t = osk.spaceBar.firstChild.firstChild;
                if (typeof (t.parentNode.className) == 'undefined' || t.parentNode.className == '')
                    t.parentNode.className = 'kmw-spacebar';
                else
                    t.parentNode.className += ' kmw-spacebar';
                t.className = 'kmw-spacebar-caption';
                kbdName = kbdName.replace(/\s*keyboard\s*/i, '');
                // We use a separate variable here to keep down on MutationObserver messages in keymanweb.js code.
                var keyboardName = "";
                if (kbdName == lgName) {
                    keyboardName = lgName;
                }
                else {
                    keyboardName = lgName + ' (' + kbdName + ')';
                }
                // It sounds redundant, but this dramatically cuts down on browser DOM processing.
                if (t.innerHTML != keyboardName) {
                    t.innerHTML = keyboardName;
                }
            }
            catch (ex) { }
        };
        /**
         * Display list of installed keyboards in pop-up menu
         **/
        osk.showLanguageMenu = function () {
            var n = 0, kbdList = keymanweb.keyboardManager.keyboardStubs, nKbds = kbdList.length;
            if (nKbds < 1)
                return;
            // Create the menu list container element
            var menu = osk.lgList = util._CreateElement('DIV'), ss;
            osk.lgList.id = 'kmw-language-menu';
            // Insert a transparent overlay to prevent anything else happening during keyboard selection,
            // but allow the menu to be closed if anywhere else on screen is touched
            menu.shim = util._CreateElement('DIV');
            menu.shim.id = 'kmw-language-menu-background';
            menu.shim.addEventListener('touchstart', function (e) {
                e.preventDefault();
                osk.hideLanguageList();
                // Display build only if touching menu, space *and* one other point on screen (build 369)
                if (e.touches.length > 2) {
                    var sX = e.touches[1].pageX, sY = e.touches[1].pageY;
                    if (sX > osk.spaceBar.offsetLeft && sX < osk.spaceBar.offsetLeft + osk.spaceBar.offsetWidth &&
                        sY > osk.spaceBar.offsetTop && sY < osk.spaceBar.offsetTop + osk.spaceBar.offsetHeight)
                        osk.showBuild();
                }
            }, false);
            document.body.appendChild(menu.shim);
            // Add two nested DIVs to properly support iOS scrolling with momentum
            //  c.f. https://github.com/joelambert/ScrollFix/issues/2
            var m2 = util._CreateElement('DIV'), s2 = m2.style, m3 = util._CreateElement('DIV'), s3 = m3.style;
            m2.id = 'kmw-menu-scroll-container';
            m3.id = 'kmw-menu-scroller';
            // Support momentum scrolling on iOS
            if ('WebkitOverflowScrolling' in s2)
                s2.WebkitOverflowScrolling = 'touch';
            m2.appendChild(m3);
            menu.appendChild(m2);
            // Add menu index strip
            var i, x, mx = util._CreateElement('DIV');
            mx.id = 'kmw-menu-index';
            for (i = 1; i <= 26; i++) {
                x = util._CreateElement('P');
                x.innerHTML = String.fromCharCode(i + 64);
                mx.appendChild(x);
            }
            // Add index selection (for a large menu)
            mx.addEventListener('touchstart', function (e) { osk.scrollToLanguage(e, m2, m3); }, false);
            mx.addEventListener('touchend', function (e) { e.stopPropagation(); e.preventDefault(); }, false);
            menu.appendChild(mx);
            //TODO: not sure if either of these two handlers ar actually needed.  touchmove handler may be doing all that is necessary.
            // Add scroll end event handling to override body scroll
            menu.addEventListener('scroll', function (e) {
                osk.lgList.scrolling = true;
            }, false);
            m2.addEventListener('scroll', function (e) {
                //osk.lgList.scrolling=true;
                if (m2.scrollTop < 1)
                    m2.scrollTop = 1;
                if (m2.scrollTop > m2.scrollHeight - m2.offsetHeight - 1)
                    m2.scrollTop = m2.scrollHeight - m2.offsetHeight - 1;
            }, false);
            // Add a list of keyboards to the innermost DIV
            osk.lgList.activeLgNo = osk.addLanguagesToMenu(m3, kbdList);
            // Get number of visible (language) selectors
            var nLgs = m3.childNodes.length - 1;
            // Do not display until sizes have been calculated
            osk.lgList.visibility = 'hidden';
            // Append menu to document body, not to OSK
            document.body.appendChild(osk.lgList);
            // Adjust size for viewport scaling (probably not needed for iOS, but check!)
            if (device.OS == 'Android' && 'devicePixelRatio' in window)
                osk.lgList.style.fontSize = (2 / window.devicePixelRatio) + 'em';
            // Adjust width for pixel scaling on Android tablets
            if (device.OS == 'Android' && device.formFactor == 'tablet' && 'devicePixelRatio' in window) {
                var w = parseInt(util.getStyleValue(menu, 'width'), 10), ms = menu.style;
                if (!isNaN(w))
                    ms.width = ms.maxWidth = (2 * w / window.devicePixelRatio) + 'px';
                w = parseInt(util.getStyleValue(m2, 'width'), 10);
                ms = m2.style;
                if (!isNaN(w))
                    ms.width = ms.maxWidth = (2 * w / window.devicePixelRatio) + 'px';
                w = parseInt(util.getStyleValue(m3, 'width'), 10);
                ms = m3.style;
                if (!isNaN(w))
                    ms.width = ms.maxWidth = (2 * w / window.devicePixelRatio) + 'px';
            }
            // Adjust initial top and height of menu
            osk.adjustLanguageMenu(0);
            // Adjust the index font size and line height
            var dy = mx.childNodes[1].offsetTop - mx.childNodes[0].offsetTop, lineHeight = Math.floor(menu.offsetHeight / 26.0), scale = Math.round(100.0 * lineHeight / dy) / 100.0, factor = (scale > 0.6 ? 1 : 2);
            if (scale > 1.25)
                scale = 1.25;
            for (i = 0; i < 26; i++) {
                var qs = mx.childNodes[i].style;
                if (factor == 2 && (i % 2) == 1) {
                    qs.display = 'none';
                }
                else {
                    qs.fontSize = (scale * factor) + 'em';
                    qs.lineHeight = (lineHeight * factor) + 'px';
                }
            }
            // Increase width of outer menu DIV by index, else hide index
            var menuWidth = m2.offsetWidth;
            if (m2.scrollHeight > m2.offsetHeight + 3)
                menuWidth = menuWidth + mx.offsetWidth;
            else
                mx.style.display = 'none';
            menu.style.width = menuWidth + 'px';
            // Now display the menu
            osk.lgList.visibility = '';
            // Set initial scroll to show current language (but never less than 1, to avoid dragging body)
            var top = m3.firstChild.offsetHeight * osk.lgList.activeLgNo + 1;
            m2.scrollTop = top;
            // The scrollTop value is limited by the device, and must be limited to avoid dragging the document body
            if (m2.scrollTop < top)
                m2.scrollTop = m2.scrollHeight - m2.offsetHeight;
            if (m2.scrollTop > m2.scrollHeight - m2.offsetHeight - 1)
                m2.scrollTop = m2.scrollHeight - m2.offsetHeight - 1;
        };
        /**
         * Adjust top and height of language menu
         *
         * @param   {number}  nKbds number of displayed keyboards to add to number of languages
         **/
        osk.adjustLanguageMenu = function (nKbds) {
            var menu = osk.lgList, m2 = menu.firstChild, m3 = m2.firstChild, barWidth = 0, s = menu.style, mx = menu.childNodes[1], maxHeight = window.innerHeight - osk.lgKey.offsetHeight - 16, nItems = m3.childNodes.length + nKbds - 1, // Number of (visible) keyboard selectors
            itemHeight = m3.firstChild.firstChild.offsetHeight, menuHeight = nItems * itemHeight;
            // Correct maxheight for viewport scaling (iPhone/iPod only) and internal position corrections
            if (device.OS == 'iOS') {
                if (device.formFactor == 'phone') {
                    barWidth = (util.landscapeView() ? 36 : 0);
                    maxHeight = (window.innerHeight - barWidth - 16) * util.getViewportScale();
                }
                else if (device.formFactor == 'tablet') {
                    barWidth = (util.landscapeView() ? 16 : 0);
                    maxHeight = (maxHeight - barWidth);
                }
            }
            // Explicitly set position and height
            s.left = util._GetAbsoluteX(osk.lgKey) + 'px';
            if (menuHeight > maxHeight)
                menuHeight = maxHeight;
            s.height = menuHeight + 'px';
            // Position menu at bottom of screen, but referred to top (works for both iOS and Firefox)
            s.top = (util._GetAbsoluteY(osk._Box) + osk._Box.offsetHeight - menuHeight + window.pageYOffset - 6) + 'px';
            s.bottom = 'auto';
            // Explicitly set the scroller and index heights to the container height
            mx.style.height = m2.style.height = s.height;
        };
        /**
         * Add an index to the language menu
         *
         *  @param  {Object}  e         touch start event from index
         *  @param  {Object}  m2        menu scroller DIV
         *  @param  {Object}  menu      DIV with list of languages
         */
        osk.scrollToLanguage = function (e, m2, menu) {
            e.stopImmediatePropagation();
            e.stopPropagation();
            e.preventDefault();
            if (e.touches[0].target.nodeName != 'P')
                return;
            var i, t, top = 0, initial = e.touches[0].target.innerHTML.charCodeAt(0), nn = menu.childNodes;
            try {
                for (i = 0; i < nn.length - 1; i++) {
                    t = nn[i].firstChild.innerHTML.toUpperCase().charCodeAt(0);
                    if (t >= initial)
                        break;
                }
            }
            catch (ex) { }
            try {
                top = menu.firstChild.offsetHeight * i + 1;
                m2.scrollTop = top;
            }
            catch (ex) {
                top = 0;
            }
            try {
                if (m2.scrollTop < top)
                    m2.scrollTop = m2.scrollHeight - m2.offsetHeight;
                if (m2.scrollTop > m2.scrollHeight - m2.offsetHeight - 1)
                    m2.scrollTop = m2.scrollHeight - m2.offsetHeight - 1;
            }
            catch (ex) { }
        };
        /**
         * Display all languages for installed keyboards in scrollable list
         *
         *    @param    {Object}    menu      DIV to which language selectors will be added
         *    @param    {Object}    kbdList   array of keyboard stub objects
         *    @return   {number}              index of currently active language
         **/
        osk.addLanguagesToMenu = function (menu, kbdList) {
            var nStubs = kbdList.length;
            // Create and sort a list of languages
            var k, n, lg, langs = [];
            for (n = 0; n < nStubs; n++) {
                lg = kbdList[n]['KL'];
                if (langs.indexOf(lg) == -1)
                    langs.push(lg);
            }
            langs.sort();
            // Get current scale factor (reciprocal of viewport scale)
            var scale = Math.round(100 / util.getViewportScale()) / 100;
            var dx, lgBar, kList, i, kb, activeLanguageIndex = -1;
            for (k = 0; k < langs.length; k++) {
                dx = util._CreateElement('DIV');
                dx.className = 'kbd-list-closed';
                lgBar = util._CreateElement('P');
                lgBar.kList = [];
                for (n = 0; n < nStubs; n++) {
                    if (kbdList[n]['KL'] == langs[k])
                        lgBar.kList.push(kbdList[n]);
                }
                // Adjust bar size for current viewport scaling (iOS only!)
                if (device.OS == 'iOS')
                    lgBar.style.fontSize = scale + 'em';
                // Add to menu
                dx.appendChild(lgBar);
                menu.appendChild(dx);
                if (langs[k] == keymanweb.keyboardManager.activeStub['KL'])
                    activeLanguageIndex = k;
                // Several keyboards for this language
                if (lgBar.kList.length > 1) {
                    lgBar.className = 'kbd-list';
                    lgBar.innerHTML = langs[k] + '...';
                    lgBar.scrolled = false;
                    lgBar.ontouchend = function (e) {
                        e.preventDefault();
                        e.stopPropagation();
                        if (e.target.scrolled)
                            e.target.scrolled = false;
                        else
                            this.parentNode.className = (this.parentNode.className == 'kbd-list-closed' ? 'kbd-list-open' : 'kbd-list-closed');
                        // Adjust top of menu to allow for expanded list
                        osk.adjustLanguageMenu(this.parentNode.className == 'kbd-list-closed' ? 0 : this.kList.length);
                    };
                    lgBar.addEventListener('touchstart', function (e) { e.stopPropagation(); }, false);
                    lgBar.addEventListener('touchmove', function (e) { e.target.scrolled = true; e.stopPropagation(); }, false);
                    for (i = 0; i < lgBar.kList.length; i++) {
                        kb = util._CreateElement('P');
                        kb.className = 'kbd-list-entry';
                        if (device.OS == 'iOS')
                            kb.style.fontSize = scale + 'em';
                        osk.addKeyboardToMenu(lgBar.kList[i], kb, false);
                        dx.appendChild(kb);
                    }
                }
                // Only one keyboard for this language
                else {
                    lgBar.innerHTML = langs[k];
                    lgBar.className = 'kbd-single-entry';
                    osk.addKeyboardToMenu(lgBar.kList[0], lgBar, true);
                }
                if (k == activeLanguageIndex)
                    lgBar.className = lgBar.className + ' current';
            }
            // Add a non-selectable bottom bar so to allow scrolling to the last language
            var padLast = util._CreateElement('DIV');
            padLast.id = 'kmw-menu-footer';
            var cancelTouch = function (e) { e.preventDefault(); e.stopPropagation(); };
            padLast.addEventListener('touchstart', cancelTouch, false);
            padLast.addEventListener('touchmove', cancelTouch, false);
            padLast.addEventListener('touchend', cancelTouch, false);
            menu.appendChild(padLast);
            return activeLanguageIndex;
        };
        /**
         * Add a keyboard entry to the language menu *
         *
         * @param   {Object}    kbd     keyboard object
         * @param   {Object}    kb      element being added and styled
         * @param   {boolean}   unique  is this the only keyboard for the language?
         */
        osk.addKeyboardToMenu = function (kbd, kb, unique) {
            kb.kn = kbd['KI']; // InternalName;
            kb.kc = kbd['KLC']; // LanguageCode;
            kb.innerHTML = unique ? kbd['KL'] : kbd['KN'].replace(' Keyboard', ''); // Name
            // Touchstart (or mspointerdown) event highlights the touched list item
            var touchStart = function (e) {
                e.stopPropagation();
                if (this.className.indexOf('selected') <= 0)
                    this.className = this.className + ' selected';
                osk.lgList.scrolling = false;
                osk.lgList.y0 = e.touches[0].pageY; //osk.lgList.childNodes[0].scrollTop;
                return true;
            }, 
            //TODO: Still drags Android background sometimes (not consistently)
            // Touchmove drags the list and prevents release from selecting the language
            touchMove = function (e) {
                e.stopImmediatePropagation();
                var scroller = osk.lgList.childNodes[0], yMax = scroller.scrollHeight - scroller.offsetHeight, y, dy;
                if ("undefined" != typeof e.pageY)
                    y = e.pageY;
                else if ("undefined" != typeof e.touches)
                    y = e.touches[0].pageY;
                else
                    return;
                dy = y - osk.lgList.y0;
                // Scroll up (show later listed languages)
                if (dy < 0) {
                    if (scroller.scrollTop >= yMax - 1) {
                        e.preventDefault();
                        osk.lgList.y0 = y;
                    }
                }
                // Scroll down (show earlier listed languages)
                else if (dy > 0) {
                    if (scroller.scrollTop < 2) {
                        e.preventDefault();
                        osk.lgList.y0 = y;
                    }
                }
                // Dont' scroll - can happen if changing scroll direction
                else
                    return;
                // Disable selected language if drag more than 5px
                if (dy < -5 || dy > 5) {
                    osk.lgList.scrolling = true;
                    this.className = this.className.replace(/\s*selected/, '');
                    osk.lgList.y0 = y;
                }
                return true;
            }, 
            // Touch release (click) event selects touched list item
            touchEnd = function (e) {
                e.preventDefault();
                if (typeof (e.stopImmediatePropagation) != 'undefined')
                    e.stopImmediatePropagation();
                else
                    e.stopPropagation();
                if (osk.lgList.scrolling) {
                    this.className = this.className.replace(/\s*selected/, '');
                }
                else {
                    com.keyman.DOMEventHandlers.states.setFocusTimer();
                    osk.lgList.style.display = 'none'; //still allows blank menu momentarily on selection
                    keymanweb.keyboardManager._SetActiveKeyboard(this.kn, this.kc, true);
                    keymanweb.keyboardManager.doKeyboardChange(this.kn, this.kc);
                    keymanweb.domManager.focusLastActiveElement();
                    osk.hideLanguageList();
                    // Update the OSK with the new keyboard
                    osk._Show();
                }
                return true;
            };
            kb.onmspointerdown = touchStart;
            kb.addEventListener('touchstart', touchStart, false);
            kb.onmspointermove = touchMove;
            kb.addEventListener('touchmove', touchMove, false);
            kb.onmspointerout = touchEnd;
            kb.addEventListener('touchend', touchEnd, false);
        };
        /**
         * Remove the language menu again
         **/
        osk.hideLanguageList = function () {
            if (osk.lgList) {
                osk.highlightKey(osk.lgKey.firstChild, false);
                osk.lgList.style.visibility = 'hidden';
                window.setTimeout(function () {
                    if (osk.lgList != null && typeof osk.lgList != 'undefined') {
                        document.body.removeChild(osk.lgList.shim);
                        document.body.removeChild(osk.lgList);
                    }
                    osk.lgList = null;
                }, 500);
            }
        };
        /**
         * Function     _UpdateVKShift
         * Scope        Private
         * @param       {Object}            e     OSK event
         * @param       {number}            v     keyboard shift state
         * @param       {(boolean|number)}  d     set (1) or clear(0) shift state bits
         * @return      {boolean}                 Always true
         * Description  Update the current shift state within KMW
         */
        osk._UpdateVKShift = function (e, v, d) {
            var keyShiftState = 0, lockStates = 0, i;
            var lockNames = ['CAPS', 'NUM_LOCK', 'SCROLL_LOCK'];
            var lockKeys = ['K_CAPS', 'K_NUMLOCK', 'K_SCROLL'];
            if (e) {
                // read shift states from Pevent
                keyShiftState = e.Lmodifiers;
                lockStates = e.Lstates;
                // Are we simulating AltGr?  If it's a simulation and not real, time to un-simulate for the OSK.
                if (keymanweb.keyboardManager.isChiral() && osk.emulatesAltGr() &&
                    (com.keyman.DOMEventHandlers.states.modStateFlags & osk.modifierBitmasks['ALT_GR_SIM']) == osk.modifierBitmasks['ALT_GR_SIM']) {
                    keyShiftState |= osk.modifierBitmasks['ALT_GR_SIM'];
                    keyShiftState &= ~osk.modifierCodes['RALT'];
                }
                for (i = 0; i < lockNames.length; i++) {
                    if (lockStates & osk.stateBitmasks[lockNames[i]]) {
                        osk._stateKeys[lockKeys[i]] = lockStates & osk.modifierCodes[lockNames[i]];
                    }
                }
            }
            else if (d) {
                keyShiftState |= v;
                for (i = 0; i < lockNames.length; i++) {
                    if (v & osk.stateBitmasks[lockNames[i]]) {
                        osk._stateKeys[lockKeys[i]] = true;
                    }
                }
            }
            else {
                keyShiftState &= ~v;
                for (i = 0; i < lockNames.length; i++) {
                    if (v & osk.stateBitmasks[lockNames[i]]) {
                        osk._stateKeys[lockKeys[i]] = false;
                    }
                }
            }
            // Find and display the selected OSK layer
            osk.layerId = osk.getLayerId(keyShiftState);
            // osk._UpdateVKShiftStyle will be called automatically upon the next _Show.
            if (osk._Visible) {
                osk._Show();
            }
            return true;
        };
        /**
         * Function     _UpdateVKShiftStyle
         * Scope        Private
         * @param       {string=}   layerId
         * Description  Updates the OSK's visual style for any toggled state keys
         */
        osk._UpdateVKShiftStyle = function (layerId) {
            var i, n, layer = null, layerElement = null;
            if (layerId) {
                for (n = 0; n < osk.layers.length; n++) {
                    if (osk.layers[n]['id'] == osk.layerId) {
                        break;
                    }
                }
                return; // Failed to find the requested layer.
            }
            else {
                n = osk.layerIndex;
                layerId = osk.layers[n]['id'];
            }
            layer = osk.layers[n];
            // Set the on/off state of any visible state keys.
            var states = ['K_CAPS', 'K_NUMLOCK', 'K_SCROLL'];
            var keys = [layer.capsKey, layer.numKey, layer.scrollKey];
            for (i = 0; i < keys.length; i++) {
                // Skip any keys not in the OSK!
                if (keys[i] == null) {
                    continue;
                }
                keys[i]['sp'] = osk._stateKeys[states[i]] ? osk.buttonClasses['SHIFT-ON'] : osk.buttonClasses['SHIFT'];
                var btn = document.getElementById(layerId + '-' + states[i]);
                osk.setButtonClass(keys[i], btn, osk.layout);
            }
        };
        /**
         * Function     _CancelMouse
         * Scope        Private
         * @param       {Object}      e     event
         * @return      {boolean}           always false
         * Description  Closes mouse click event
         */
        osk._CancelMouse = function (e) {
            e = keymanweb._GetEventObject(e); // I2404 - Manage IE events in IFRAMEs
            if (e && e.preventDefault)
                e.preventDefault();
            if (e) {
                e.cancelBubble = true;
                e.returnValue = false;
            } // I2409 - Avoid focus loss for visual keyboard events
            return false;
        };
        /**
         * Function     showLayer
         * Scope        Private
         * @param       {string}      id      ID of the layer to show
         * @return      {boolean}             true if the layer is shown, or false if it cannot be found
         * Description  Shows the layer identified by 'id' in the on screen keyboard
         */
        osk.showLayer = function (id) {
            if (keymanweb.keyboardManager.activeKeyboard) {
                for (var i = 0; i < osk.layers.length; i++) {
                    if (osk.layers[i].id == id) {
                        osk.layerId = id;
                        osk._Show();
                        return true;
                    }
                }
            }
            return false;
        };
        /**
         * Get the wanted height of the OSK for touch devices
         *
         *  @return   {number}    height in pixels
         **/
        osk.getHeight = function () {
            // KeymanTouch - get OSK height from device
            if (typeof (keymanweb['getOskHeight']) == 'function')
                return keymanweb['getOskHeight']();
            var oskHeightLandscapeView = Math.floor(Math.min(screen.availHeight, screen.availWidth) / 2), height = oskHeightLandscapeView;
            if (device.formFactor == 'phone') {
                var sx = Math.min(screen.height, screen.width), sy = Math.max(screen.height, screen.width);
                if (util.portraitView())
                    height = Math.floor(Math.max(screen.availHeight, screen.availWidth) / 3);
                else
                    height = height * (sy / sx) / 1.6; //adjust for aspect ratio, increase slightly for iPhone 5
            }
            // Correct for viewport scaling (iOS - Android 4.2 does not want this, at least on Galaxy Tab 3))
            if (device.OS == 'iOS') {
                height = height / util.getViewportScale();
            }
            // Correct for devicePixelratio - needed on Android 4.1.2 phones,
            // for Opera, Chrome and Firefox, but not for native browser!   Exclude native browser for Build 344.
            if (device.OS == 'Android' && device.formFactor == 'phone' && 'devicePixelRatio' in window) {
                var bMatch = /Firefox|Chrome|OPR/;
                if (bMatch.test(navigator.userAgent))
                    height = height * window.devicePixelRatio;
            }
            return height;
        };
        /**
         * Get the wanted width of the OSK for touch devices
         *
         *  @return   {number}    height in pixels
         **/
        osk.getWidth = function () {
            // KeymanTouch - get OSK height from device
            if (typeof (keymanweb['getOskWidth']) == 'function') {
                return keymanweb['getOskWidth']();
            }
            var width;
            if (util.device.OS == "iOS") {
                // iOS does not interchange these values when the orientation changes!
                //width = util.portraitView() ? screen.width : screen.height;
                width = window.innerWidth;
            }
            else if (device.OS == 'Android') {
                try {
                    width = document.documentElement.clientWidth;
                }
                catch (ex) {
                    width = screen.availWidth;
                }
            }
            else {
                width = screen.width;
            }
            return width;
        };
        /**
         * Mouse down/mouse over event handler (desktop only)
         *
         * @param   {Event}  e  mouse over/mouse down event object
         */
        osk.mouseOverMouseDownHandler = function (e) {
            var t = util.eventTarget(e);
            if (t === null || device.formFactor != 'desktop')
                return;
            if (t.nodeName == 'SPAN')
                t = t.parentNode;
            if (t.className.indexOf('kmw-key-label') >= 0) {
                t = t.parentNode;
            }
            if (util.eventType(e) == 'mousedown') {
                osk.currentKey = t.id;
                osk._CancelMouse(e);
                osk.highlightKey(t, true);
            }
            else if (t.id == osk.currentKey) {
                osk.highlightKey(t, true);
            }
        };
        /**
         * Mouse up/mouse out event handler (desktop only)
         *
         * @param   {Event}  e  mouse up/out event object
         */
        osk.mouseUpMouseOutHandler = function (e) {
            var t = util.eventTarget(e);
            if (t === null || device.formFactor != 'desktop')
                return;
            if (t.nodeName == 'SPAN')
                t = t.parentNode;
            if (t.className.indexOf('kmw-key-label') >= 0) {
                t = t.parentNode;
            }
            osk.highlightKey(t, false);
            // Process as click if mouse button released anywhere over key
            if (util.eventType(e) == 'mouseup') {
                if (t.id == osk.currentKey)
                    osk.clickKey(t);
                osk.currentKey = '';
            }
        };
        /**
         * Returns the default properties for a key object, used to construct
         * both a base keyboard key and popup keys
         *
         * @return    {Object}    An object that contains default key properties
         */
        osk.getDefaultKeyObject = function () {
            return {
                'text': '',
                'width': '100',
                'pad': '15',
                'sp': '0',
                'layer': null,
                'nextlayer': null
            };
        };
        /**
         * Create the OSK for a particular keyboard and device
         *
         * @param       {Object}              layout      OSK layout definition
         * @param       {string}              formFactor  layout form factor
         * @return      {Object}                          fully formatted OSK object
         */
        osk.deviceDependentLayout = function (layout, formFactor) {
            var lDiv = util._CreateElement('DIV'), ls = lDiv.style, actualHeight = 0;
            // Set OSK box default style
            lDiv.className = 'kmw-key-layer-group';
            // Adjust OSK height for mobile and tablet devices TODO move outside this function???
            switch (formFactor) {
                case 'phone':
                case 'tablet':
                    actualHeight = osk.getHeight();
                    ls.height = actualHeight + 'px';
                    break;
            }
            // Return empty DIV if no layout defined
            if (layout == null)
                return lDiv;
            // Set default OSK font size (Build 344, KMEW-90)
            var layoutFS = layout['fontsize'];
            if (typeof layoutFS == 'undefined' || layoutFS == null || layoutFS == '')
                ls.fontSize = '1em';
            else
                ls.fontSize = layout['fontsize'];
            osk.fontSize = ls.fontSize; //TODO: move outside function*********
            // Create a separate OSK div for each OSK layer, only one of which will ever be visible
            var n, i, j, layers, layer, gDiv, rows, row, rowHeight, rDiv, keys, key, kDiv, pDiv, rs, ks, btn, bs, ps, gs;
            layers = layout['layer'];
            // Set key default attributes (must use exportable names!)
            var tKey = osk.getDefaultKeyObject();
            tKey['fontsize'] = ls.fontSize;
            // Identify key labels (e.g. *Shift*) that require the special OSK font
            var specialLabel = /\*\w+\*/;
            // ***Delete any empty rows at the end added by compiler bug...
            for (n = 0; n < layers.length; n++) {
                layer = layers[n];
                rows = layer['row'];
                for (i = rows.length; i > 0; i--) {
                    if (rows[i - 1]['key'].length > 0)
                        break;
                }
                if (i < rows.length)
                    rows.splice(i - rows.length, rows.length - i);
            }
            // ...remove to here when compiler bug fixed ***
            // Set the OSK row height, **assuming all layers have the same number of rows**
            // Calculate default row height
            rowHeight = 100 / rows.length;
            // For desktop OSK, use a percentage of the OSK height
            if (formFactor == 'desktop') {
                rowHeight = 100 / rows.length;
            }
            // Get the actual available document width and scale factor according to device type
            var objectWidth;
            if (formFactor == 'desktop') {
                objectWidth = 100;
            }
            else {
                objectWidth = osk.getWidth();
            }
            if (device.touchable) //  /*&& ('ontouchstart' in window)*/ // Except Chrome emulation doesn't set this.
             { // Not to mention, it's rather redundant.
                lDiv.addEventListener('touchstart', osk.touch, true);
                // The listener below fails to capture when performing automated testing checks in Chrome emulation unless 'true'.
                lDiv.addEventListener('touchend', osk.release, true);
                lDiv.addEventListener('touchmove', osk.moveOver, false);
                //lDiv.addEventListener('touchcancel', osk.cancel,false); //event never generated by iOS
            }
            for (n = 0; n < layers.length; n++) {
                layer = layers[n];
                layer.aligned = false;
                gDiv = util._CreateElement('DIV'), gs = gDiv.style;
                gDiv.className = 'kmw-key-layer';
                // Always make the first layer visible
                gs.display = (n == 0 ? 'block' : 'none');
                gs.height = ls.height;
                // Set font for layer if defined in layout
                if ('font' in layout)
                    gs.fontFamily = layout['font'];
                else
                    gs.fontFamily = '';
                gDiv.layer = gDiv.nextLayer = layer['id'];
                if (typeof layer['nextlayer'] == 'string')
                    gDiv.nextLayer = layer['nextlayer'];
                // Create a DIV for each row of the group
                rows = layer['row'];
                // Calculate the maximum row width (in layout units)
                var totalWidth = 0;
                for (i = 0; i < rows.length; i++) {
                    var width = 0;
                    row = rows[i];
                    keys = row['key'];
                    for (j = 0; j < keys.length; j++) {
                        key = keys[j];
                        // Test for a trailing comma included in spec, added as null object by IE
                        if (key == null) {
                            keys.length = keys.length - 1;
                        }
                        else {
                            var kw, kp;
                            kw = (typeof key['width'] == 'string' && key['width'] != '') ? parseInt(key['width'], 10) : 100;
                            if (isNaN(kw) || kw == 0)
                                kw = 100;
                            key['width'] = kw.toString();
                            kp = (typeof key['pad'] == 'string' && key['pad'] != '') ? parseInt(key['pad'], 10) : 15;
                            if (isNaN(kp) || kp == 0)
                                kp = 15; // KMEW-119
                            key['pad'] = kp.toString();
                            width += kw + kp;
                            //if(typeof key['width'] == 'string' && key['width'] != '') width += parseInt(key['width'],10); else width += 100;
                            //if(typeof key['pad'] == 'string' && key['pad'] != '') width += parseInt(key['pad'],10); else width += 5;
                        }
                    }
                    if (width > totalWidth)
                        totalWidth = width;
                }
                // Add default right margin
                if (formFactor == 'desktop') {
                    totalWidth += 5; // KMEW-117
                }
                else {
                    // TODO: Not entirely clear why this needs to be 15 instead of 5 on touch layouts.  We probably have
                    // a miscalculation somewhere
                    totalWidth += 15;
                }
                for (i = 0; i < rows.length; i++) {
                    rDiv = util._CreateElement('DIV');
                    rDiv.className = 'kmw-key-row';
                    // The following event trap is needed to prevent loss of focus in IE9 when clicking on a key gap.
                    // Unclear why normal _CreateElement prevention of loss of focus does not seem to work here.
                    // Appending handler to event handler chain does not work (other event handling remains active).
                    rDiv.onmousedown = util.mouseDownPreventDefaultHandler; // Build 360
                    //util.attachDOMEvent(rDiv,'mousedown',function(e){if(e)e.preventDefault();
                    row = rows[i];
                    rs = rDiv.style;
                    // Set row height. (Phone and tablet heights are later recalculated
                    // and set in px, allowing for viewport scaling.)
                    rs.maxHeight = rs.height = rowHeight + '%';
                    // Apply defaults, setting the width and other undefined properties for each key
                    keys = row['key'];
                    for (j = 0; j < keys.length; j++) {
                        key = keys[j];
                        for (var tp in tKey) { // tKey = osk.getDefaultKeyObject();
                            if (typeof key[tp] != 'string')
                                key[tp] = tKey[tp];
                        }
                        // Modify the key type for special keys with non-standard labels
                        // to allow the keyboard font to ovveride the SpecialOSK font.
                        // Blank keys are no longer reclassed - can use before/after CSS to add text
                        switch (key['sp']) {
                            case '1':
                                if (!specialLabel.test(key['text']) && key['text'] != '')
                                    key['sp'] = '3';
                                break;
                            case '2':
                                if (!specialLabel.test(key['text']) && key['text'] != '')
                                    key['sp'] = '4';
                                break;
                        }
                    }
                    // Calculate actual key widths by summing defined widths and scaling each key to %,
                    // adjusting the width of the last key to make the total exactly 100%
                    // Save each percentage key width as a separate member (do *not* overwrite layout specified width!)
                    // NB: the 'percent' suffix is historical, units are percent on desktop devices, but pixels on touch devices
                    // All key widths and paddings are rounded for uniformity
                    var keyPercent, padPercent, totalPercent = 0;
                    for (j = 0; j < keys.length - 1; j++) {
                        keyPercent = Math.round(parseInt(keys[j]['width'], 10) * objectWidth / totalWidth);
                        keys[j]['widthpc'] = keyPercent;
                        padPercent = Math.round(parseInt(keys[j]['pad'], 10) * objectWidth / totalWidth);
                        keys[j]['padpc'] = padPercent;
                        totalPercent += padPercent + keyPercent;
                    }
                    // Allow for right OSK margin (15 layout units)
                    totalPercent += Math.round(15 * objectWidth / totalWidth);
                    // If a single key, and padding is negative, add padding to right align the key
                    if (keys.length == 1 && parseInt(keys[0]['pad'], 10) < 0) {
                        keyPercent = Math.round(parseInt(keys[0]['width'], 10) * objectWidth / totalWidth);
                        keys[0]['widthpc'] = keyPercent;
                        totalPercent += keyPercent;
                        keys[0]['padpc'] = (objectWidth - totalPercent);
                    }
                    else if (keys.length > 0) {
                        j = keys.length - 1;
                        padPercent = Math.round(parseInt(keys[j]['pad'], 10) * objectWidth / totalWidth);
                        keys[j]['padpc'] = padPercent;
                        totalPercent += padPercent;
                        keys[j]['widthpc'] = (objectWidth - totalPercent);
                    }
                    //Create the key square (an outer DIV) for each key element with padding, and an inner DIV for the button (btn)
                    totalPercent = 0;
                    for (j = 0; j < keys.length; j++) {
                        key = keys[j];
                        var keyGenerator = new com.keyman.OSKBaseKey(key, layer['id']);
                        var keyTuple = keyGenerator.construct(layout, rs, totalPercent);
                        rDiv.appendChild(keyTuple.element);
                        totalPercent += keyTuple.percent;
                    }
                    // Add row to layer
                    gDiv.appendChild(rDiv);
                }
                // Add layer to group
                lDiv.appendChild(gDiv);
            }
            return lDiv;
        };
        osk.clearPopup = function () {
            // Remove the displayed subkey array, if any, and cancel popup request
            var sk = document.getElementById('kmw-popup-keys');
            if (sk != null) {
                if (sk.shim)
                    osk._Box.removeChild(sk.shim);
                sk.parentNode.removeChild(sk);
            }
            if (osk.popupCallout)
                osk._Box.removeChild(osk.popupCallout);
            osk.popupCallout = null;
            if (osk.subkeyDelayTimer) {
                window.clearTimeout(osk.subkeyDelayTimer);
                osk.subkeyDelayTimer = null;
            }
            osk.popupBaseKey = null;
        };
        /**
         * OSK touch start event handler
         *
         *  @param  {Event} e   touch start event object
         *
         */
        osk.touch = function (e) {
            // Identify the key touched
            var t = e.changedTouches[0].target, key = osk.keyTarget(t);
            // Save the touch point
            osk.touchX = e.changedTouches[0].pageX;
            // Set the key for the new touch point to be current target, if defined
            osk.currentTarget = key;
            // Prevent multi-touch if popup displayed
            var sk = document.getElementById('kmw-popup-keys');
            if ((sk && sk.style.visibility == 'visible') || osk.popupVisible)
                return;
            // Keep track of number of active (unreleased) touch points
            osk.touchCount = e.touches.length;
            // Get nearest key if touching a hidden key or the end of a key row
            if ((key && (key.className.indexOf('key-hidden') >= 0))
                || t.className.indexOf('kmw-key-row') >= 0) {
                key = osk.findNearestKey(e, t);
            }
            // Do not do anything if no key identified!
            if (key == null) {
                return;
            }
            // Get key name (K_...) from element ID
            var keyIdComponents = key.id.split('-');
            var keyName = keyIdComponents[keyIdComponents.length - 1];
            // Highlight the touched key
            osk.highlightKey(key, true);
            // Special function keys need immediate action
            if (keyName == 'K_LOPT' || keyName == 'K_ROPT') {
                window.setTimeout(function () { osk.clickKey(key); }, 0);
                osk.keyPending = null;
            }
            // Also backspace, to allow delete to repeat while key held
            else if (keyName == 'K_BKSP') {
                // While we could inline the execution of the delete key here, we lose the ability to
                // record the backspace key if we do so.
                osk.clickKey(key);
                osk.deleteKey = key;
                osk.deleting = window.setTimeout(osk.repeatDelete, 500);
                osk.keyPending = null;
            }
            else {
                if (osk.keyPending) {
                    osk.highlightKey(osk.keyPending, false);
                    osk.clickKey(osk.keyPending);
                    osk.clearPopup();
                    // Decrement the number of unreleased touch points to prevent
                    // sending the keystroke again when the key is actually released
                    osk.touchCount--;
                }
                else {
                    // If this key has subkey, start timer to display subkeys after delay, set up release
                    osk.touchHold(key);
                    //if(key.subKeys != null) osk.subkeyDelayTimer=window.setTimeout(function(){osk.showSubKeys(key);},osk.popupDelay);
                }
                osk.keyPending = key;
            }
        };
        /**
         * OSK touch release event handler
         *
         *  @param  {Event} e   touch release event object
         *
         **/
        osk.release = function (e) {
            // Prevent incorrect multi-touch behaviour if native or device popup visible
            var sk = document.getElementById('kmw-popup-keys'), t = osk.currentTarget;
            if ((sk && sk.style.visibility == 'visible') || osk.popupVisible) {
                // Ignore release if a multiple touch
                if (e.touches.length > 0)
                    return;
                // Cancel (but do not execute) pending key if neither a popup key or the base key
                if ((t == null) || ((t.id.indexOf('popup') < 0) && (t.id != osk.popupBaseKey.id))) {
                    osk.highlightKey(osk.keyPending, false);
                    osk.clearPopup();
                    osk.keyPending = null;
                }
            }
            // Handle menu key release event
            if (t && t.id)
                osk.optionKey(e, t.id, false);
            // Test if moved off screen (effective release point must be corrected for touch point horizontal speed)
            // This is not completely effective and needs some tweaking, especially on Android
            var x = e.changedTouches[0].pageX, beyondEdge = ((x < 2 && osk.touchX > 5) ||
                (x > window.innerWidth - 2 && osk.touchX < window.innerWidth - 5));
            // Save then decrement current touch count
            var tc = osk.touchCount;
            if (osk.touchCount > 0)
                osk.touchCount--;
            // Process and clear highlighting of pending target
            if (osk.keyPending) {
                osk.highlightKey(osk.keyPending, false);
                // Output character unless moved off key
                if (osk.keyPending.className.indexOf('hidden') < 0 &&
                    tc > 0 && !beyondEdge)
                    osk.clickKey(osk.keyPending);
                osk.clearPopup();
                osk.keyPending = null;
            }
            // Always clear highlighting of current target on release (multi-touch)
            else {
                var tt = e.changedTouches[0];
                t = osk.keyTarget(tt.target);
                if (!t) {
                    var t1 = document.elementFromPoint(tt.clientX, tt.clientY);
                    t = osk.findNearestKey(e, t1);
                }
                osk.highlightKey(t, false);
            }
            // Clear repeated backspace if active
            if (osk.deleting)
                window.clearTimeout(osk.deleting);
            osk.deleting = 0;
        };
        /**
         * OSK touch move event handler
         *
         *  @param  {Event} e   touch move event object
         *
         **/
        osk.moveOver = function (e) {
            e.preventDefault();
            e.cancelBubble = true;
            if (typeof e.stopImmediatePropagation == 'function')
                e.stopImmediatePropagation();
            else if (typeof e.stopPropagation == 'function')
                e.stopPropagation();
            // Do not attempt to support reselection of target key for overlapped keystrokes
            if (e.touches.length > 1 || osk.touchCount == 0)
                return;
            // Get touch position
            var x = typeof e.touches == 'object' ? e.touches[0].clientX : e.clientX, y = typeof e.touches == 'object' ? e.touches[0].clientY : e.clientY;
            // Move target key and highlighting
            var t = e.changedTouches[0], t1 = document.elementFromPoint(x, y), key0 = osk.keyPending, key1 = osk.keyTarget(t1);
            // Find the nearest key to the touch point if not on a visible key
            if ((key1 && key1.className.indexOf('key-hidden') >= 0) ||
                (t1 && (!key1) && t1.className.indexOf('key-row') >= 0)) {
                key1 = osk.findNearestKey(e, t1);
            }
            // Stop repeat if no longer on BKSP key
            if (key1 && (typeof key1.id == 'string') && (key1.id.indexOf('BKSP') < 0)) {
                if (osk.deleting)
                    window.clearTimeout(osk.deleting);
                osk.deleting = 0;
            }
            // Do not move over keys if device popup visible
            if (osk.popupVisible) {
                if (key1 == null) {
                    if (key0)
                        osk.highlightKey(key0, false);
                    osk.keyPending = null;
                }
                else {
                    if (key1 == osk.popupBaseKey) {
                        if (!osk.hasClass(key1, 'kmw-key-touched'))
                            osk.highlightKey(key1, true);
                        osk.keyPending = key1;
                    }
                    else {
                        if (key0)
                            osk.highlightKey(key0, false);
                        osk.keyPending = null;
                    }
                }
                return;
            }
            // Use the popup duplicate of the base key if a phone with a visible popup array
            var sk = document.getElementById('kmw-popup-keys');
            if (sk && sk.style.visibility == 'visible'
                && device.formFactor == 'phone' && key1 == osk.popupBaseKey) {
                key1 = sk.childNodes[0].firstChild;
            }
            // Identify current touch position (to manage off-key release)
            osk.currentTarget = key1;
            // Clear previous key highlighting
            if (key0 && key1 && (key1.id != key0.id))
                osk.highlightKey(key0, false);
            // If popup is visible, need to move over popup, not over main keyboard
            osk.highlightSubKeys(key1, x, y);
            if (sk && sk.style.visibility == 'visible') {
                if (key1 && key1.id.indexOf('popup') < 0 && key1 != osk.popupBaseKey)
                    return;
                if (key1 && key1 == osk.popupBaseKey && key1.className.indexOf('kmw-key-touched') < 0)
                    osk.highlightKey(key1, true);
            }
            // Cancel touch if moved up and off keyboard, unless popup keys visible
            else {
                var yMin = Math.max(5, osk._Box.offsetTop - 0.25 * osk._Box.offsetHeight);
                if (key0 && e.touches[0].pageY < Math.max(5, osk._Box.offsetTop - 0.25 * osk._Box.offsetHeight)) {
                    osk.highlightKey(key0, false);
                    osk.showKeyTip(null, false);
                    osk.keyPending = null;
                }
            }
            // Replace the target key, if any, by the new target key
            // Do not replace a null target, as that indicates the key has already been released
            if (key1 && osk.keyPending)
                osk.keyPending = key1;
            if (osk.keyPending) {
                if (key0 != key1 || key1.className.indexOf('kmw-key-touched') < 0)
                    osk.highlightKey(key1, true);
            }
            if (key0 && key1 && (key1 != key0) && (key1.id != '')) {
                //  Display the touch-hold keys (after a pause)
                osk.touchHold(key1);
                /*
              // Clear and restart the popup timer
                if(osk.subkeyDelayTimer)
                {
                  window.clearTimeout(osk.subkeyDelayTimer);
                  osk.subkeyDelayTimer = null;
                }
                if(key1.subKeys != null)
                {
                  osk.subkeyDelayTimer = window.setTimeout(
                    function()
                    {
                      osk.clearPopup();
                      osk.showSubKeys(key1);
                    },
                    osk.popupDelay);
                }
                */
            }
        };
        // osk.cancel = function(e) {} //cancel event is never generated by iOS
        /**
         * More reliable way of identifying  element class
         * @param   {Object}  e HTML element
         * @param   {string}  name  class name
         * @return  {boolean}
         */
        osk.hasClass = function (e, name) {
            var className = " " + name + " ";
            return (" " + e.className + " ").replace(/[\n\t\r\f]/g, " ").indexOf(className) >= 0;
        };
        /**
         * Get the current key target from the touch point element within the key
         *
         * @param   {Object}  t   element at touch point
         * @return  {Object}      the key element (or null)
         **/
        osk.keyTarget = function (t) {
            try {
                if (t) {
                    if (osk.hasClass(t, 'kmw-key'))
                        return t;
                    if (t.parentNode && osk.hasClass(t.parentNode, 'kmw-key'))
                        return t.parentNode;
                    if (t.firstChild && osk.hasClass(t.firstChild, 'kmw-key'))
                        return t.firstChild;
                }
            }
            catch (ex) { }
            return null;
        };
        /**
         * Identify the key nearest to the touch point if at the end of a key row,
         * but return null more than about 0.6 key width from the nearest key.
         *
         *  @param  {Event}   e   touch event
         *  @param  {Object}  t   HTML object at touch point
         *  @return {Object}      nearest key to touch point
         *
         **/
        osk.findNearestKey = function (e, t) {
            if ((!e) || (typeof e.changedTouches == 'undefined')
                || (e.changedTouches.length == 0))
                return null;
            // Get touch point on screen
            var x = e.changedTouches[0].pageX;
            // Get key-row beneath touch point
            while (t && t.className.indexOf('key-row') < 0)
                t = t.parentNode;
            if (!t)
                return null;
            // Find minimum distance from any key
            var k, k0 = 0, dx, dxMax = 24, dxMin = 100000, x1, x2;
            for (k = 0; k < t.childNodes.length; k++) {
                if (t.childNodes[k].firstChild.className.indexOf('key-hidden') >= 0)
                    continue;
                x1 = t.childNodes[k].offsetLeft;
                x2 = x1 + t.childNodes[k].offsetWidth;
                dx = x1 - x;
                if (dx >= 0 && dx < dxMin) {
                    k0 = k;
                    dxMin = dx;
                }
                dx = x - x2;
                if (dx >= 0 && dx < dxMin) {
                    k0 = k;
                    dxMin = dx;
                }
            }
            if (dxMin < 100000) {
                t = t.childNodes[k0];
                x1 = t.offsetLeft;
                x2 = x1 + t.offsetWidth;
                // Limit extended touch area to the larger of 0.6 of key width and 24 px
                if (t.offsetWidth > 40)
                    dxMax = 0.6 * t.offsetWidth;
                if (((x1 - x) >= 0 && (x1 - x) < dxMax) ||
                    ((x - x2) >= 0 && (x - x2) < dxMax))
                    return t.firstChild;
            }
            return null;
        };
        /**
         *  Repeat backspace as long as the backspace key is held down
         **/
        osk.repeatDelete = function () {
            if (osk.deleting) {
                osk.clickKey(osk.deleteKey);
                osk.deleting = window.setTimeout(osk.repeatDelete, 100);
            }
        };
        /**
         * Attach appropriate class to each key button, according to the layout
         *
         * @param       {Object}    key     key object
         * @param       {Object}    btn     button object
         * @param       {Object=}   layout  source layout description (optional, sometimes)
         */
        osk.setButtonClass = function (key, btn, layout) {
            var n = 0, keyTypes = ['default', 'shift', 'shift-on', 'special', 'special-on', '', '', '', 'deadkey', 'blank', 'hidden'];
            if (typeof key['dk'] == 'string' && key['dk'] == '1') {
                n = 8;
            }
            if (typeof key['sp'] == 'string') {
                n = parseInt(key['sp'], 10);
            }
            if (n < 0 || n > 10) {
                n = 0;
            }
            layout = layout || osk.layout;
            // Apply an overriding class for 5-row layouts
            var nRows = layout['layer'][0]['row'].length;
            if (nRows > 4 && util.device.formFactor == 'phone') {
                btn.className = 'kmw-key kmw-5rows kmw-key-' + keyTypes[n];
            }
            else {
                btn.className = 'kmw-key kmw-key-' + keyTypes[n];
            }
        };
        /**
         * Converts the legacy BK property from pre 10.0 into the KLS keyboard layer spec format,
         * sparsifying it as possible to pre-emptively check invalid layers.
         *
         * @param   {Array}   BK      keyboard object (as loaded)
         * @return  {Object}
         */
        osk.processLegacyDefinitions = function (BK) {
            //['default','shift','ctrl','shiftctrl','alt','shiftalt','ctrlalt','shiftctrlalt'];
            var idList = osk.generateLayerIds(false); // Non-chiral.
            var KLS = {};
            // The old default:  eight auto-managed layers...
            for (var n = 0; n < idList.length; n++) {
                var id = idList[n], arr = [], valid = false;
                // ... with keycode mappings in blocks of 65.
                for (var k = 0; k < 65; k++) {
                    var index = k + 65 * n;
                    arr.push(BK[index]);
                    // The entry for K_SPACE's keycode tends to hold ' ' instead of '', which causes
                    // the whole layer to be treated as 'valid' if not included in the conditional.
                    if (index < BK.length && BK[index] != '' && k != dfltCodes.indexOf('K_SPACE')) {
                        valid = true;
                    }
                }
                if (valid) {
                    KLS[id] = arr;
                }
            }
            // There must always be at least a plain 'default' layer.  Array(65).fill('') would be preferable but isn't supported on IE, 
            // but buildDefaultLayer will set the defaults for these layers if no entry exists for them in the array due to length.
            if (typeof KLS['default'] == 'undefined' || !KLS['default']) {
                KLS['default'] = [''];
            }
            // There must always be at least a plain 'shift' layer.
            if (typeof KLS['shift'] == 'undefined' || !KLS['shift']) {
                KLS['shift'] = [''];
            }
            return KLS;
        };
        /**
         * Sets a formatting property for the modifier keys when constructing a default layout for a keyboard.
         *
         * @param   {Object}    layer   // One layer specification
         * @param   {boolean}   chiral  // Whether or not the keyboard uses chiral modifier information.
         * @param   {string}    formFactor  // The form factor of the device the layout is being constructed for.
         * @param   {boolean}   key102      // Whether or not the extended key 102 should be hidden.
         */
        osk.formatDefaultLayer = function (layer, chiral, formFactor, key102) {
            var layerId = layer['id'];
            // Correct appearance of state-dependent modifier keys according to group
            for (var i = 0; i < layer['row'].length; i++) {
                var row = layer['row'][i];
                var keys = row['key'];
                for (var j = 0; j < keys.length; j++) {
                    var key = keys[j];
                    switch (key['id']) {
                        case 'K_SHIFT':
                        case 'K_LSHIFT':
                        case 'K_RSHIFT':
                            if (layerId.indexOf('shift') != -1) {
                                key['sp'] = osk.buttonClasses['SHIFT-ON'];
                            }
                            if ((formFactor != 'desktop') && (layerId != 'default')) {
                                key['nextlayer'] = 'default';
                            }
                            break;
                        case 'K_LCTRL':
                        case 'K_LCONTROL':
                            if (chiral) {
                                if (layerId.indexOf('leftctrl') != -1) {
                                    key['sp'] = osk.buttonClasses['SHIFT-ON'];
                                }
                                break;
                            }
                        case 'K_RCTRL':
                        case 'K_RCONTROL':
                            if (chiral) {
                                if (layerId.indexOf('rightctrl') != -1) {
                                    key['sp'] = osk.buttonClasses['SHIFT-ON'];
                                }
                                break;
                            }
                        case 'K_CONTROL':
                            if (layerId.indexOf('ctrl') != -1) {
                                if (!chiral || (layerId.indexOf('leftctrl') != -1 && layerId.indexOf('rightctrl') != -1)) {
                                    key['sp'] = osk.buttonClasses['SHIFT-ON'];
                                }
                            }
                            break;
                        case 'K_LALT':
                            if (chiral) {
                                if (layerId.indexOf('leftalt') != -1) {
                                    key['sp'] = osk.buttonClasses['SHIFT-ON'];
                                }
                                break;
                            }
                        case 'K_RALT':
                            if (chiral) {
                                if (layerId.indexOf('rightalt') != -1) {
                                    key['sp'] = osk.buttonClasses['SHIFT-ON'];
                                }
                                break;
                            }
                        case 'K_ALT':
                            if (layerId.indexOf('alt') != -1) {
                                if (!chiral || (layerId.indexOf('leftalt') != -1 && layerId.indexOf('rightalt') != -1)) {
                                    key['sp'] = osk.buttonClasses['SHIFT-ON'];
                                }
                            }
                            break;
                        case 'K_oE2':
                            if (typeof key102 == 'undefined' || !key102) {
                                if (formFactor == 'desktop') {
                                    keys.splice(j--, 1);
                                    keys[0]['width'] = '200';
                                }
                                else {
                                    keys[j]['sp'] = osk.buttonClasses['HIDDEN'];
                                }
                            }
                            break;
                    }
                }
            }
        };
        /**
         * Generates a list of potential layer ids for the specified chirality mode.
         *
         * @param   {boolean|number}   chiral    // Does the keyboard use chiral modifiers or not?
         */
        osk.generateLayerIds = function (chiral) {
            var layerCnt, offset;
            if (chiral) {
                layerCnt = 32;
                offset = 0x01;
            }
            else {
                layerCnt = 8;
                offset = 0x10;
            }
            var layerIds = [];
            for (var i = 0; i < layerCnt; i++) {
                layerIds.push(osk.getLayerId(i * offset));
            }
            return layerIds;
        };
        /**
         * Signifies whether or not the OSK facilitates AltGr / Right-alt emulation for this keyboard.
         * @param   {Object=}   keyLabels
         * @return  {boolean}
         */
        osk.emulatesAltGr = function (keyLabels) {
            var layers;
            // If we're not chiral, we're not emulating.
            if (!keymanweb.keyboardManager.isChiral()) {
                return false;
            }
            if (!keyLabels) {
                var activeKeyboard = keymanweb.keyboardManager.activeKeyboard;
                if (activeKeyboard == null || activeKeyboard['KV'] == null) {
                    return false;
                }
                layers = activeKeyboard['KV']['KLS'];
            }
            else {
                layers = keyLabels;
            }
            var emulationMask = osk.modifierCodes['LCTRL'] | osk.modifierCodes['LALT'];
            var unshiftedEmulationLayer = layers[osk.getLayerId(emulationMask)];
            var shiftedEmulationLayer = layers[osk.getLayerId(osk.modifierCodes['SHIFT'] | emulationMask)];
            // buildDefaultLayout ensures that these are aliased to the original modifier set being emulated.
            // As a result, we can directly test for reference equality.
            if (unshiftedEmulationLayer != null &&
                unshiftedEmulationLayer != layers[osk.getLayerId(osk.modifierCodes['RALT'])]) {
                return false;
            }
            if (shiftedEmulationLayer != null &&
                shiftedEmulationLayer != layers[osk.getLayerId(osk.modifierCodes['RALT'] | osk.modifierCodes['SHIFT'])]) {
                return false;
            }
            // It's technically possible for the OSK to not specify anything while allowing chiral input.  A last-ditch catch:
            var bitmask = keymanweb.keyboardManager.getKeyboardModifierBitmask();
            if ((bitmask & emulationMask) != emulationMask) {
                // At least one of the emulation modifiers is never used by the keyboard!  We can confirm everything's safe.
                return true;
            }
            if (unshiftedEmulationLayer == null && shiftedEmulationLayer == null) {
                // We've run out of things to go on; we can't detect if chiral AltGr emulation is intended or not.
                if (!osk.altGrWarning) {
                    console.warn("Could not detect if AltGr emulation is safe, but defaulting to active emulation!");
                    // Avoid spamming the console with warnings on every call of the method.
                    osk.altGrWarning = true;
                }
            }
            return true;
        };
        /**
         * Build a default layout for keyboards with no explicit layout
         *
         * @param   {Object}  PVK         keyboard object (as loaded)
         * @param   {Number}  kbdBitmask  keyboard modifier bitmask
         * @param   {string}  formFactor
         * @return  {Object}
         */
        osk.buildDefaultLayout = function (PVK, kbdBitmask, formFactor) {
            var layout;
            // Build a layout using the default for the device
            var layoutType = formFactor, dfltLayout = keymanweb['dfltLayout'];
            if (typeof dfltLayout[layoutType] != 'object') {
                layoutType = 'desktop';
            }
            // Clone the default layout object for this device
            layout = util.deepCopy(dfltLayout[layoutType]);
            var n, layers = layout['layer'], keyLabels = PVK['KLS'], key102 = PVK['K102'];
            var i, j, k, m, row, rows, key, keys;
            var chiral = (kbdBitmask & osk.modifierBitmasks.IS_CHIRAL);
            var kmw10Plus = !(typeof keyLabels == 'undefined' || !keyLabels);
            if (!kmw10Plus) {
                // Save the processed key label information to the keyboard's general data.
                // Makes things more efficient elsewhere and for reloading after keyboard swaps.
                keyLabels = PVK['KLS'] = osk.processLegacyDefinitions(PVK['BK']);
            }
            // Identify key labels (e.g. *Shift*) that require the special OSK font
            var specialLabel = /\*\w+\*/;
            // *** Step 1:  instantiate the layer objects. ***
            // Get the list of valid layers, enforcing that the 'default' layer must be the first one processed.
            var validIdList = Object.getOwnPropertyNames(keyLabels), invalidIdList = [];
            validIdList.splice(validIdList.indexOf('default'), 1);
            validIdList = ['default'].concat(validIdList);
            // Automatic AltGr emulation if the 'leftctrl-leftalt' layer is otherwise undefined.
            if (osk.emulatesAltGr(keyLabels)) {
                // We insert only the layers that need to be emulated.
                if ((validIdList.indexOf('leftctrl-leftalt') == -1) && validIdList.indexOf('rightalt') != -1) {
                    validIdList.push('leftctrl-leftalt');
                    keyLabels['leftctrl-leftalt'] = keyLabels['rightalt'];
                }
                if ((validIdList.indexOf('leftctrl-leftalt-shift') == -1) && validIdList.indexOf('rightalt-shift') != -1) {
                    validIdList.push('leftctrl-leftalt-shift');
                    keyLabels['leftctrl-leftalt-shift'] = keyLabels['rightalt-shift'];
                }
            }
            // For desktop devices, we must create all layers, even if invalid.
            if (formFactor == 'desktop') {
                invalidIdList = osk.generateLayerIds(chiral);
                // Filter out all ids considered valid.  (We also don't want duplicates in the following list...)
                for (n = 0; n < invalidIdList.length; n++) {
                    if (validIdList.indexOf(invalidIdList[n]) != -1) {
                        invalidIdList.splice(n--, 1);
                    }
                }
            }
            // This ensures all 'valid' layers are at the front of the layer array and managed by the main loop below.
            // 'invalid' layers aren't handled by the loop and thus remain blank after it.
            var idList = validIdList.concat(invalidIdList);
            if (kmw10Plus && formFactor != 'desktop') { // KLS exists, so we know the exact layer set.
                // Find the SHIFT key...
                var shiftKey = null;
                rows = layers[0]['row'];
                for (var r = 0; r < rows.length; r++) {
                    keys = rows[r]['key'];
                    for (var c = 0; c < keys.length; c++) {
                        key = keys[c];
                        if (key['id'] == 'K_SHIFT') {
                            shiftKey = key;
                        }
                    }
                }
                if (shiftKey) {
                    // Erase the legacy shifted subkey array.
                    shiftKey['sk'] = [];
                    for (var layerID in keyLabels) {
                        if (layerID == 'default' || layerID == 'shift') {
                            // These two are accessible from the layer without subkeys.
                            continue;
                        }
                        // Create a new subkey for the specified layer so that it will be accessible via OSK.
                        var specialChar = osk.modifierSpecials[layerID];
                        shiftKey['sk'].push(new com.keyman.OSKKeySpec("K_" + specialChar, specialChar, null, "1", layerID));
                    }
                }
                else {
                    // Seriously, this should never happen.  It's here for the debugging log only.
                    console.warn("Error in default layout - cannot find default Shift key!");
                }
            }
            for (n = 0; n < idList.length; n++) {
                // Populate non-default (shifted) keygroups
                if (n > 0) {
                    layers[n] = util.deepCopy(layers[0]);
                }
                layers[n]['id'] = idList[n];
                layers[n]['nextlayer'] = idList[n]; // This would only be different for a dynamic keyboard
                // Extraced into a helper method to improve readability.
                osk.formatDefaultLayer(layers[n], chiral != 0, formFactor, !!key102);
            }
            // *** Step 2: Layer objects now exist; time to fill them with the appropriate key labels and key styles ***
            for (n = 0; n < layers.length; n++) {
                var layer = layers[n], kx, shiftKey = null, nextKey = null, allText = '';
                var capsKey = null, numKey = null, scrollKey = null; // null if not in the OSK layout.
                var layerSpec = keyLabels[layer['id']];
                var isShift = layer['id'] == 'shift' ? 1 : 0;
                var isDefault = layer['id'] == 'default' || isShift ? 1 : 0;
                rows = layer['row'];
                for (i = 0; i < rows.length; i++) {
                    keys = rows[i]['key'];
                    for (j = 0; j < keys.length; j++) {
                        key = keys[j];
                        kx = dfltCodes.indexOf(key['id']);
                        // Only create keys for defined layers.  ('default' and 'shift' are always defined.)
                        if (layerSpec || isDefault) {
                            // Get keycap text from visual keyboard array, if defined in keyboard
                            if (layerSpec) {
                                if (kx >= 0 && kx < layerSpec.length)
                                    key['text'] = layerSpec[kx];
                            }
                            // Fall back to US English keycap text as default for the base two layers if not otherwise defined.
                            // (Any 'ghost' keys must be explicitly defined in layout for these layers.)
                            if (isDefault) {
                                if ((key['text'] == '' || typeof key['text'] == 'undefined') && key['id'] != 'K_SPACE' && kx + 65 * isShift < dfltText.length) {
                                    key['text'] = dfltText[kx + 65 * isShift];
                                }
                            }
                        }
                        // Leave any unmarked key caps as null strings
                        if (typeof (key['text']) == 'undefined') {
                            key['text'] = '';
                        }
                        // Detect important tracking keys.
                        switch (key['id']) {
                            case "K_SHIFT":
                                shiftKey = key;
                                break;
                            case "K_TAB":
                                nextKey = key;
                                break;
                            case "K_CAPS":
                                capsKey = key;
                                break;
                            case "K_NUMLOCK":
                                numKey = key;
                                break;
                            case "K_SCROLL":
                                scrollKey = key;
                                break;
                        }
                        // Remove pop-up shift keys referencing invalid layers (Build 349)
                        if (key['sk'] != null) {
                            for (k = 0; k < key['sk'].length; k++) {
                                if (validIdList.indexOf(key['sk'][k]['nextlayer']) == -1) {
                                    key['sk'].splice(k--, 1);
                                }
                            }
                            if (key['sk'].length == 0) {
                                key['sk'] = null;
                            }
                        }
                    }
                }
                // We're done with the layer keys initialization pass.  Time to do post-analysis layer-level init where necessary.
                layer.shiftKey = shiftKey;
                layer.capsKey = capsKey;
                layer.numKey = numKey;
                layer.scrollKey = scrollKey;
                // Set modifier key appearance and behaviour for non-desktop devices using the default layout
                if (formFactor != 'desktop') {
                    if (n > 0 && shiftKey != null) {
                        shiftKey['sp'] = osk.buttonClasses['SHIFT-ON'];
                        shiftKey['sk'] = null;
                        shiftKey['text'] = osk.modifierSpecials[layers[n].id] ? osk.modifierSpecials[layers[n].id] : "*Shift*";
                    }
                }
            }
            return layout;
        };
        /**
         * Function     _GenerateVisualKeyboard
         * Scope        Private
         * @param       {Object}      PVK         Visual keyboard name
         * @param       {Object}      Lhelp       true if OSK defined for this keyboard
         * @param       {Object}      layout0
         * @param       {Number}      kbdBitmask  Keyboard modifier bitmask
         * Description  Generates the visual keyboard element and attaches it to KMW
         */
        osk._GenerateVisualKeyboard = function (PVK, Lhelp, layout0, kbdBitmask) {
            var Ldiv, LdivC, layout = layout0;
            var Lkbd = util._CreateElement('DIV'), oskWidth; //s=Lkbd.style,
            var activeKeyboard = keymanweb.keyboardManager.activeKeyboard;
            // Build a layout using the default for the device
            if (typeof layout != 'object' || layout == null)
                layout = osk.buildDefaultLayout(PVK, kbdBitmask, device.formFactor);
            // Create the collection of HTML elements from the device-dependent layout object
            osk.layout = layout;
            osk.layers = layout['layer'];
            // Override font if specified by keyboard
            if ('font' in layout)
                osk.fontFamily = layout['font'];
            else
                osk.fontFamily = '';
            // Set flag to add default (US English) key label if specified by keyboard
            if (typeof layout['displayUnderlying'] != 'undefined') {
                layout.keyLabels = layout['displayUnderlying'] == true; // force bool
            }
            else {
                layout.keyLabels = activeKeyboard && ((typeof (activeKeyboard['KDU']) != 'undefined') && activeKeyboard['KDU']);
            }
            LdivC = osk.deviceDependentLayout(layout, device.formFactor);
            osk.ddOSK = true;
            // Append the OSK layer group container element to the containing element
            osk.keyMap = LdivC;
            Lkbd.appendChild(LdivC);
            // Set base class and box class - OS and keyboard added for Build 360
            osk._DivVKbdHelp = osk._DivVKbd = Lkbd;
            osk._Box.className = device.formFactor + ' ' + device.OS.toLowerCase() + ' kmw-osk-frame';
            Lkbd.className = device.formFactor + ' kmw-osk-inner-frame';
            // Add header element to OSK only for desktop browsers
            if (device.formFactor == 'desktop')
                osk._Box.appendChild(osk.controlBar());
            // Add primary keyboard element to OSK
            osk._Box.appendChild(Lkbd);
            // Add footer element to OSK only for desktop browsers
            if (device.formFactor == 'desktop')
                osk._Box.appendChild(osk.resizeBar());
            // For other devices, adjust the object heights, allowing for viewport scaling
            else
                osk.adjustHeights();
        };
        /**
         * Create copy of the OSK that can be used for embedding in documentation or help
         * The currently active keyboard will be returned if PInternalName is null
         *
         *  @param  {string}          PInternalName   internal name of keyboard, with or without Keyboard_ prefix
         *  @param  {number}          Pstatic         static keyboard flag  (unselectable elements)
         *  @param  {string=}         argFormFactor   layout form factor, defaulting to 'desktop'
         *  @param  {(string|number)=}  argLayerId    name or index of layer to show, defaulting to 'default'
         *  @return {Object}                          DIV object with filled keyboard layer content
         */
        keymanweb['BuildVisualKeyboard'] = keymanweb.buildOSK = function (PInternalName, Pstatic, argFormFactor, argLayerId) {
            var PKbd = keymanweb.keyboardManager.activeKeyboard, Ln, kbd = null, formFactor = (typeof (argFormFactor) == 'undefined' ? 'desktop' : argFormFactor), layerId = (typeof (argLayerId) == 'undefined' ? 'default' : argLayerId);
            var keyboardsList = keymanweb.keyboardManager.keyboards;
            if (PInternalName != null) {
                var p = PInternalName.toLowerCase().replace('keyboard_', '');
                for (Ln = 0; Ln < keyboardsList.length; Ln++) {
                    if (p == keyboardsList[Ln]['KI'].toLowerCase().replace('keyboard_', '')) {
                        PKbd = keyboardsList[Ln];
                        break;
                    }
                }
            }
            if (!PKbd)
                return null;
            var layouts = PKbd['KVKL'], layout = null, PVK = PKbd['KV'];
            // Get the layout defined in the keyboard, or its nearest equivalent
            if (typeof layouts == 'object') {
                if (typeof (layouts[formFactor]) == 'object' && layouts[formFactor] != null)
                    layout = layouts[formFactor];
                else if (formFactor == 'phone' && typeof (layouts['tablet']) == 'object' && layouts['tablet'] != null)
                    layout = layouts['tablet'];
                else if (formFactor == 'tablet' && typeof (layouts['phone']) == 'object' && layouts['phone'] != null)
                    layout = layouts['phone'];
                else if (typeof (layouts['desktop']) == 'object' && layouts['desktop'] != null)
                    layout = layouts['desktop'];
            }
            // Else get a default layout for the device for this keyboard
            if (layout == null && PVK != null)
                layout = osk.buildDefaultLayout(PVK, keymanweb.keyboardManager.getKeyboardModifierBitmask(PKbd), formFactor);
            // Cannot create an OSK if no layout defined, just return empty DIV
            if (layout != null) {
                if (typeof layout['displayUnderlying'] != 'undefined') {
                    layout.keyLabels = layout['displayUnderlying'] == true; // force bool
                }
                else {
                    layout.keyLabels = typeof (PKbd['KDU']) != 'undefined' && PKbd['KDU'];
                }
            }
            kbd = osk.deviceDependentLayout(layout, formFactor);
            kbd.className = formFactor + '-static kmw-osk-inner-frame';
            // Select the layer to display, and adjust sizes
            if (layout != null) {
                var layer, row, key, Lr, Lk;
                for (Ln = 0; Ln < layout.layer.length; Ln++) {
                    layer = kbd.childNodes[Ln];
                    for (Lr = 0; Lr < layer.childNodes.length; Lr++) {
                        row = layer.childNodes[Lr];
                        for (Lk = 0; Lk < row.childNodes.length; Lk++) {
                            key = row.childNodes[Lk];
                            key.style.height = '100%';
                        }
                    }
                    if (typeof (layerId) == 'number')
                        layer.style.display = (Ln == layerId && layerId >= 0 ? 'block' : 'none');
                    else if (typeof (layerId) == 'string')
                        layer.style.display = (layout.layer[Ln].id == layerId ? 'block' : 'none');
                    else
                        layer.style.display = (Ln == 0 ? 'block' : 'none');
                }
            }
            else {
                kbd.innerHTML = "<p style='color:#c40; font-size:0.5em;margin:10px;'>No " + formFactor + " layout is defined for " + PKbd['KN'] + ".</p>";
            }
            // Add a faint border
            kbd.style.border = '1px solid #ccc';
            return kbd;
        };
        /**
         * Adjust the absolute height of each keyboard element after a rotation
         *
         **/
        osk.adjustHeights = function () {
            if (!osk._Box || !osk._Box.firstChild || !osk._Box.firstChild.firstChild || !osk._Box.firstChild.firstChild.childNodes)
                return;
            var layers = osk._Box.firstChild.firstChild.childNodes, nRows = layers[0].childNodes.length, oskHeight = osk.getHeight(), rowHeight = Math.floor(oskHeight / (nRows == 0 ? 1 : nRows)), nLayer, nRow, rs, keys, nKeys, nKey, key, ks, j, pad, fs = 1.0;
            if (device.OS == 'Android' && 'devicePixelRatio' in window)
                rowHeight = rowHeight / window.devicePixelRatio;
            oskHeight = nRows * rowHeight;
            var b = osk._Box, bs = b.style;
            bs.height = bs.maxHeight = (oskHeight + 3) + 'px';
            b = b.firstChild.firstChild;
            bs = b.style;
            bs.height = bs.maxHeight = (oskHeight + 3) + 'px';
            // TODO: Logically, this should be needed for Android, too - may need to be changed for the next version!
            if (device.OS == 'iOS')
                fs = fs / util.getViewportScale();
            bs.fontSize = fs + 'em';
            var resizeLabels = (device.OS == 'iOS' && device.formFactor == 'phone' && util.landscapeView());
            for (nLayer = 0; nLayer < layers.length; nLayer++) {
                // Check the heights of each row, in case different layers have different row counts.
                nRows = layers[nLayer].childNodes.length;
                rowHeight = Math.floor(oskHeight / (nRows == 0 ? 1 : nRows));
                pad = Math.round(0.15 * rowHeight);
                layers[nLayer].style.height = (oskHeight + 3) + 'px';
                for (nRow = 0; nRow < nRows; nRow++) {
                    rs = layers[nLayer].childNodes[nRow].style;
                    rs.bottom = (nRows - nRow - 1) * rowHeight + 1 + 'px';
                    rs.maxHeight = rs.height = rowHeight + 'px';
                    keys = layers[nLayer].childNodes[nRow].childNodes;
                    nKeys = keys.length;
                    for (nKey = 0; nKey < nKeys; nKey++) {
                        key = keys[nKey];
                        //key.style.marginTop = (device.formFactor == 'phone' ? pad : 4)+'px';
                        //**no longer needed if base key label and popup icon are within btn, not container**
                        // Must set the height of the btn DIV, not the label (if any)
                        for (j = 0; j < key.childNodes.length; j++)
                            if (osk.hasClass(key.childNodes[j], 'kmw-key'))
                                break;
                        ks = key.childNodes[j].style;
                        ks.bottom = rs.bottom;
                        ks.height = ks.minHeight = (rowHeight - pad) + 'px';
                        // Rescale keycap labels on iPhone (iOS 7)
                        if (resizeLabels && (j > 0))
                            key.childNodes[0].style.fontSize = '6px';
                    }
                }
            }
        };
        /**
         * Create a control bar with title and buttons for the desktop OSK
         */
        osk.controlBar = function () {
            var bar = util._CreateElement('DIV'), title = '';
            bar.id = 'keymanweb_title_bar';
            bar.className = 'kmw-title-bar';
            bar.onmousedown = osk._VMoveMouseDown;
            if (keymanweb.keyboardManager.activeKeyboard) {
                title = keymanweb.keyboardManager.activeKeyboard['KN'];
            }
            var Ltitle = util._CreateElement('SPAN');
            Ltitle.className = 'kmw-title-bar-caption';
            Ltitle.innerHTML = title;
            bar.appendChild(Ltitle);
            var Limg = osk.closeButton = util._CreateElement('DIV');
            Limg.id = 'kmw-close-button';
            Limg.className = 'kmw-title-bar-image';
            Limg.onmousedown = osk._CancelMouse;
            Limg.onclick = function () { osk._Hide(true); };
            bar.appendChild(Limg);
            Limg = osk.helpImg = util._CreateElement('DIV');
            Limg.id = 'kmw-help-image';
            Limg.className = 'kmw-title-bar-image';
            Limg.title = 'KeymanWeb Help';
            Limg.onclick = function () {
                var p = {};
                util.callEvent('osk.helpclick', p);
                if (window.event)
                    window.event.returnValue = false;
                return false;
            };
            Limg.onmousedown = osk._CancelMouse;
            bar.appendChild(Limg);
            Limg = osk.configImg = util._CreateElement('DIV');
            Limg.id = 'kmw-config-image';
            Limg.className = 'kmw-title-bar-image';
            Limg.title = 'KeymanWeb Configuration Options';
            Limg.onclick = function () {
                var p = {};
                util.callEvent('osk.configclick', p);
                if (window.event)
                    window.event.returnValue = false;
                return false;
            };
            Limg.onmousedown = osk._CancelMouse;
            bar.appendChild(Limg);
            Limg = osk.pinImg = util._CreateElement('DIV'); //I2186
            Limg.id = 'kmw-pin-image';
            Limg.className = 'kmw-title-bar-image';
            Limg.title = 'Pin the On Screen Keyboard to its default location on the active text box';
            Limg.onclick = function () {
                osk.loadCookie();
                osk.userPositioned = false;
                osk.saveCookie();
                osk._Show();
                osk.doResizeMove(); //allow the UI to respond to OSK movements
                if (osk.pinImg)
                    osk.pinImg.style.display = 'none';
                if (window.event)
                    window.event.returnValue = false;
                return false;
            };
            Limg.onmousedown = osk._CancelMouse;
            bar.appendChild(Limg);
            return bar;
        };
        /**
         * Display build number
         */
        osk.showBuild = function () {
            util.alert('KeymanWeb Version ' + keymanweb['version'] + '.' + keymanweb['build'] + '<br /><br />'
                + '<span style="font-size:0.8em">Copyright &copy; 2017 SIL International</span>');
        };
        /**
         * Create a bottom bar with a resizing icon for the desktop OSK
         */
        osk.resizeBar = function () {
            var bar = util._CreateElement('DIV');
            bar.className = 'kmw-footer';
            bar.onmousedown = osk._CancelMouse;
            // Add caption
            var Ltitle = util._CreateElement('DIV');
            Ltitle.className = 'kmw-footer-caption';
            Ltitle.innerHTML = '<a href="https://keyman.com/developer/keymanweb/">KeymanWeb</a>';
            Ltitle.id = 'keymanweb-osk-footer-caption';
            // Display build number on shift+double click
            util.attachDOMEvent(Ltitle, 'dblclick', function (e) { if (e && e.shiftKey)
                osk.showBuild(); }, false);
            // Prevent selection of caption (IE - set by class for other browsers)
            if ('onselectstart' in Ltitle)
                Ltitle.onselectstart = util.selectStartHandler; //IE (Build 360)
            bar.appendChild(Ltitle);
            var Limg = util._CreateElement('DIV');
            Limg.className = 'kmw-footer-resize';
            Limg.onmousedown = osk._VResizeMouseDown;
            Limg.onmouseover = Limg.onmouseout = osk._VResizeMouseOut;
            bar.appendChild(Limg);
            osk.resizeIcon = Limg;
            //TODO: the image never appears in IE8, have no idea why!
            return bar;
        };
        /**
         * Function     _VKbdMouseOver
         * Scope        Private
         * @param       {Object}      e      event
         * Description  Activate the KMW UI on mouse over
         */
        osk._VKbdMouseOver = function (e) {
            keymanweb.uiManager.setActivatingUI(true);
        };
        /**
         * Function     _VKbdMouseOut
         * Scope        Private
         * @param       {Object}      e      event
         * Description  Cancel activation of KMW UI on mouse out
         */
        osk._VKbdMouseOut = function (e) {
            keymanweb.uiManager.setActivatingUI(false);
        };
        /**
         * Function     _VResizeMouseOver, _VResizeMouseOut
         * Scope        Private
         * @param       {Object}      e      event
         * Description  Process end of resizing of KMW UI
         */
        osk._VResizeMouseOver = osk._VResizeMouseOut = function (e) {
            e = keymanweb._GetEventObject(e); // I2404 - Manage IE events in IFRAMEs
            if (!e)
                return false;
            if (e && e.preventDefault)
                e.preventDefault();
            var r = osk.getRect();
            osk.width = r.width;
            osk.height = r.height;
            e.cancelBubble = true;
            return false;
        };
        /**
         * Function     _VResizeMouseDown
         * Scope        Private
         * @param       {Object}      e      event
         * Description  Process resizing of KMW UI
         */
        osk._VResizeMouseDown = function (e) {
            keymanweb.uiManager.justActivated = true;
            e = keymanweb._GetEventObject(e); // I2404 - Manage IE events in IFRAMEs
            if (!e)
                return true;
            osk.resizing = 1;
            var Lposx, Lposy;
            if (e.pageX) {
                Lposx = e.pageX;
                Lposy = e.pageY;
            }
            else if (e.clientX) {
                Lposx = e.clientX + document.body.scrollLeft;
                Lposy = e.clientY + document.body.scrollTop;
            }
            osk._ResizeMouseX = Lposx;
            osk._ResizeMouseY = Lposy;
            if (document.onmousemove != osk._VResizeMouseMove && document.onmousemove != osk._VMoveMouseMove) // I1472 - Dragging off edge of browser window causes muckup
             {
                osk._VPreviousMouseMove = document.onmousemove;
                osk._VPreviousMouseUp = document.onmouseup;
            }
            osk._VPreviousCursor = document.body.style.cursor;
            osk._VPreviousMouseButton = (typeof (e.which) == 'undefined' ? e.button : e.which);
            osk._VOriginalWidth = osk._DivVKbd.offsetWidth;
            osk._VOriginalHeight = osk._DivVKbd.offsetHeight;
            document.onmousemove = osk._VResizeMouseMove;
            document.onmouseup = osk._VResizeMoveMouseUp;
            if (document.body.style.cursor)
                document.body.style.cursor = 'se-resize';
            if (e && e.preventDefault)
                e.preventDefault();
            e.cancelBubble = true;
            return false;
        };
        /**
         * Function     _VResizeMouseMove
         * Scope        Private
         * @param       {Object}      e      event
         * Description  Process mouse movement during resizing of OSK
         */
        osk._VResizeMouseMove = function (e) {
            var Lposx, Lposy;
            e = keymanweb._GetEventObject(e); // I2404 - Manage IE events in IFRAMEs
            if (!e)
                return true;
            osk.resizing = 1;
            if (osk._VPreviousMouseButton != (typeof (e.which) == 'undefined' ? e.button : e.which)) // I1472 - Dragging off edge of browser window causes muckup
             {
                return osk._VResizeMoveMouseUp(e);
            }
            else {
                if (e.pageX) {
                    Lposx = e.pageX;
                    Lposy = e.pageY;
                }
                else if (e.clientX) {
                    Lposx = e.clientX + document.body.scrollLeft;
                    Lposy = e.clientY + document.body.scrollTop;
                }
                var newWidth = (osk._VOriginalWidth + Lposx - osk._ResizeMouseX), newHeight = (osk._VOriginalHeight + Lposy - osk._ResizeMouseY);
                // Set the smallest and largest OSK size
                if (newWidth < 0.2 * screen.width)
                    newWidth = 0.2 * screen.width;
                if (newHeight < 0.1 * screen.height)
                    newHeight = 0.1 * screen.height;
                if (newWidth > 0.9 * screen.width)
                    newWidth = 0.9 * screen.width;
                if (newHeight > 0.5 * screen.height)
                    newWidth = 0.5 * screen.height;
                // Set OSK width
                osk._DivVKbd.style.width = newWidth + 'px';
                // Explicitly change OSK height and font size - cannot safely rely on scaling from font
                osk._DivVKbd.style.height = newHeight + 'px';
                osk._DivVKbd.style.fontSize = (newHeight / 8) + 'px';
                if (e && e.preventDefault)
                    e.preventDefault();
                e.cancelBubble = true;
                return false;
            }
        };
        /**
         * Function     _VMoveMouseDown
         * Scope        Private
         * @param       {Object}      e      event
         * Description  Process mouse down on OSK
         */
        osk._VMoveMouseDown = function (e) {
            var Lposx, Lposy;
            keymanweb.uiManager.justActivated = true;
            e = keymanweb._GetEventObject(e); // I2404 - Manage IE events in IFRAMEs
            if (!e)
                return true;
            osk.resizing = 1;
            if (e.pageX) {
                Lposx = e.pageX;
                Lposy = e.pageY;
            }
            else if (e.clientX) {
                Lposx = e.clientX + document.body.scrollLeft;
                Lposy = e.clientY + document.body.scrollTop;
            }
            if (document.onmousemove != osk._VResizeMouseMove && document.onmousemove != osk._VMoveMouseMove) // I1472 - Dragging off edge of browser window causes muckup
             {
                osk._VPreviousMouseMove = document.onmousemove;
                osk._VPreviousMouseUp = document.onmouseup;
            }
            osk._VPreviousCursor = document.body.style.cursor;
            osk._VPreviousMouseButton = (typeof (e.which) == 'undefined' ? e.button : e.which);
            osk._VMoveX = Lposx - osk._Box.offsetLeft;
            osk._VMoveY = Lposy - osk._Box.offsetTop;
            if (keymanweb.keyboardManager.isCJK())
                osk.pinImg.style.left = '15px';
            document.onmousemove = osk._VMoveMouseMove;
            document.onmouseup = osk._VResizeMoveMouseUp;
            if (document.body.style.cursor)
                document.body.style.cursor = 'move';
            if (e && e.preventDefault)
                e.preventDefault();
            e.cancelBubble = true;
            return false;
        };
        /**
         * Process mouse drag on OSK
         *
         * @param       {Object}      e      event
         */
        osk._VMoveMouseMove = function (e) {
            var Lposx, Lposy;
            e = keymanweb._GetEventObject(e); // I2404 - Manage IE events in IFRAMEs
            if (!e)
                return true;
            if (osk.noDrag)
                return true;
            osk.resizing = 1;
            osk.userPositioned = true;
            osk.pinImg.style.display = 'block';
            if (osk._VPreviousMouseButton != (typeof (e.which) == 'undefined' ? e.button : e.which)) // I1472 - Dragging off edge of browser window causes muckup
             {
                return osk._VResizeMoveMouseUp(e);
            }
            else {
                if (e.pageX) {
                    Lposx = e.pageX;
                    Lposy = e.pageY;
                }
                else if (e.clientX) {
                    Lposx = e.clientX + document.body.scrollLeft;
                    Lposy = e.clientY + document.body.scrollTop;
                }
                osk._Box.style.left = (Lposx - osk._VMoveX) + 'px';
                osk._Box.style.top = (Lposy - osk._VMoveY) + 'px';
                if (e && e.preventDefault)
                    e.preventDefault();
                var r = osk.getRect();
                osk.width = r.width;
                osk.height = r.height;
                e.cancelBubble = true;
                return false;
            }
        };
        /**
         * Function     _VResizeMoveMouseUp
         * Scope        Private
         * @param       {Object}      e      event
         * Description  Process mouse up during resizing of KMW UI
         */
        osk._VResizeMoveMouseUp = function (e) {
            e = keymanweb._GetEventObject(e); // I2404 - Manage IE events in IFRAMEs
            if (!e)
                return true;
            osk.resizing = 0;
            osk.currentKey = null;
            document.onmousemove = osk._VPreviousMouseMove;
            document.onmouseup = osk._VPreviousMouseUp;
            if (document.body.style.cursor)
                document.body.style.cursor = osk._VPreviousCursor;
            keymanweb.domManager.focusLastActiveElement();
            if (e && e.preventDefault)
                e.preventDefault();
            keymanweb.uiManager.justActivated = false;
            keymanweb.uiManager.setActivatingUI(false);
            if (osk._DivVKbd) {
                osk._VOriginalWidth = osk._DivVKbd.offsetWidth;
                osk._VOriginalHeight = osk._DivVKbd.offsetHeight;
            }
            osk.doResizeMove();
            e.cancelBubble = true;
            osk.saveCookie();
            return false;
        };
        /**
         * Function     userPositioned
         * Scope        Public
         * @return      {(boolean|number)}          true if user located
         * Description  Test if OSK window has been repositioned by user
         */
        osk['userLocated'] = function () {
            return osk.userPositioned;
        };
        /**
         * Description  Display KMW OSK (at position set in callback to UI)
         * Function     show
         * Scope        Public
         * @param       {(boolean|number)=}      bShow     True to display, False to hide, omitted to toggle
         */
        osk['show'] = function (bShow) {
            if (arguments.length > 0) {
                osk._Enabled = bShow;
                if (bShow)
                    osk._Show();
                else
                    osk._Hide(true);
            }
            else {
                if (osk._Visible)
                    osk._Hide(true);
                else
                    osk._Show();
            }
        };
        /**
         * Allow UI to respond to OSK being shown (passing position and properties)
         *
         * @param       {Object=}       p     object with coordinates and userdefined flag
         * @return      {boolean}
         *
         */
        osk.doShow = function (p) {
            return util.callEvent('osk.show', p);
        };
        /**
         * Allow UI to update respond to OSK being hidden
         *
         * @param       {Object=}       p     object with coordinates and userdefined flag
         * @return      {boolean}
         *
         */
        osk.doHide = function (p) {
            return util.callEvent('osk.hide', p);
        };
        /**
         * Allow UI to update OSK position and properties
         *
         * @param       {Object=}     p       object with coordinates and userdefined flag
         *
         */
        osk.doResizeMove = function (p) {
            return util.callEvent('osk.resizemove', p);
        };
        /**
         * Display KMW OSK at specified position (returns nothing)
         *
         * @param       {number=}     Px      x-coordinate for OSK rectangle
         * @param       {number=}     Py      y-coordinate for OSK rectangle
         */
        osk._Show = function (Px, Py) {
            // Do not try to display OSK if undefined, or no active element
            if (osk._Box == null || keymanweb.domManager.getActiveElement() == null)
                return;
            // Never display the OSK for desktop browsers unless KMW element is focused, and a keyboard selected
            if ((!device.touchable) && (keymanweb.keyboardManager.activeKeyboard == null || !osk._Enabled))
                return;
            var Ls = osk._Box.style;
            // Do not display OSK until it has been positioned correctly
            if (device.touchable && Ls.bottom == '') {
                Ls.visibility = 'hidden';
            }
            if (device.touchable) {
                /* In case it's still '0' from a hide() operation.
                 * Happens when _Show is called before the transitionend events are processed,
                 * which can happen in bulk-rendering contexts.
                 *
                 * (Opacity is only modified when device.touchable = true, though a couple of extra
                 * conditions may apply.)
                 */
                Ls.opacity = '1';
            }
            // The following code will always be executed except for externally created OSK such as EuroLatin
            if (osk.ddOSK) {
                // Enable the currently active keyboard layer and update the default nextLayer member
                var n, nLayer = -1, b = osk._DivVKbd.childNodes[0].childNodes;
                for (n = 0; n < b.length; n++) {
                    if (b[n].layer == osk.layerId) {
                        b[n].style.display = 'block';
                        //b[n].style.visibility='visible';
                        osk.nextLayer = osk.layerId;
                        osk.layerIndex = nLayer = n;
                        if (typeof osk.layers[n]['nextlayer'] == 'string')
                            osk.nextLayer = osk.layers[n]['nextlayer'];
                        // If osk._Show has been called, there's probably been a change in modifier or state key state.  Keep it updated!
                        osk._UpdateVKShiftStyle();
                    }
                    else {
                        b[n].style.display = 'none';
                        //b[n].style.visibility='hidden';
                    }
                }
                if (device.touchable) {
                    Ls.position = 'fixed';
                    Ls.left = Ls.bottom = '0px';
                    Ls.height = Ls.maxHeight = osk._Box.firstChild.firstChild.style.height;
                    Ls.border = 'none';
                    Ls.borderTop = '1px solid gray';
                    osk._Enabled = 1;
                    osk._Visible = 1; // I3363 (Build 301)
                    // Identify and save references to the language key, hide keyboard key, and space bar
                    osk.lgKey = osk.getSpecialKey(nLayer, 'K_LOPT'); //TODO: should be saved with layer
                    osk.hkKey = osk.getSpecialKey(nLayer, 'K_ROPT');
                    // Always adjust screen height if iPhone or iPod, to take account of viewport changes
                    if (device.OS == 'iOS' && device.formFactor == 'phone')
                        osk.adjustHeights();
                }
                // Define for both desktop and touchable OSK
                osk.spaceBar = osk.getSpecialKey(nLayer, 'K_SPACE'); //TODO: should be saved with layer
            }
            //TODO: may need to return here for touch devices??
            Ls.display = 'block'; //Ls.visibility='visible';
            osk.showLanguage();
            if (device.formFactor == 'desktop') {
                Ls.position = 'absolute';
                Ls.display = 'block'; //Ls.visibility='visible';
                Ls.left = '0px';
                osk.loadCookie();
                if (Px >= 0) //probably never happens, legacy support only
                 {
                    Ls.left = Px + 'px';
                    Ls.top = Py + 'px';
                }
                else {
                    if (osk.userPositioned) {
                        Ls.left = osk.x + 'px';
                        Ls.top = osk.y + 'px';
                    }
                    else {
                        var el = keymanweb.domManager.getActiveElement();
                        if (osk.dfltX != '')
                            Ls.left = osk.dfltX;
                        else if (typeof el != 'undefined' && el != null)
                            Ls.left = util._GetAbsoluteX(el) + 'px';
                        if (osk.dfltY != '')
                            Ls.top = osk.dfltY;
                        else if (typeof el != 'undefined' && el != null)
                            Ls.top = (util._GetAbsoluteY(el) + el.offsetHeight) + 'px';
                    }
                }
                osk._Enabled = 1;
                osk._Visible = 1;
                if (osk._DivVKbd) {
                    osk.width = osk._DivVKbd.offsetWidth;
                    osk.height = osk._DivVKbd.offsetHeight;
                }
                osk.saveCookie();
                var pin = osk.pinImg;
                if (typeof pin != 'undefined' && pin != null)
                    pin.style.display = osk.userPositioned ? 'block' : 'none';
            }
            // If OSK still hidden, make visible only after all calculation finished
            if (Ls.visibility == 'hidden')
                window.setTimeout(function () { osk._Box.style.visibility = 'visible'; }, 0);
            // Allow desktop UI to execute code when showing the OSK
            if (!device.touchable) {
                var Lpos = {};
                Lpos['x'] = osk._Box.offsetLeft;
                Lpos['y'] = osk._Box.offsetTop;
                Lpos['userLocated'] = osk.userPositioned;
                osk.doShow(Lpos);
            }
        };
        /**
         *  Adjust the width of the last cell in each row for length differences
         *  due to rounding percentage widths to nearest pixel.
         *
         *  @param  {number}  nLayer    Index of currently visible layer
         */
        osk.adjustRowLengths = function (nLayer) {
            if (nLayer >= 0)
                return; //TODO: TEST ONLY - remove code if not needed
            var maxWidth, layers = osk._DivVKbd.childNodes[0].childNodes;
            if (nLayer < 0 || nLayer >= layers.length || layers[nLayer].aligned)
                return;
            // Do not try and align if not visible!
            if (layers[nLayer].style.display != 'block')
                return;
            // Set max width to be 6 px less than OSK layer width (allow for inter-key spacing)
            // TODO: Adjustment needs to be device and orientation specific
            maxWidth = osk._DivVKbd.childNodes[0].offsetWidth - 6;
            if (device.OS == 'Windows') {
                maxWidth -= util.landscapeView() ? 4 : 40;
            }
            var i, rows = layers[nLayer].childNodes, keys, nKeys, lastKey, xMax;
            for (i = 0; i < rows.length; i++) {
                keys = rows[i].childNodes;
                nKeys = keys.length;
                xMax = keys[nKeys - 2].offsetLeft + keys[nKeys - 2].offsetWidth;
                lastKey = keys[nKeys - 1];
                lastKey.style.width = (maxWidth - xMax) + 'px';
            }
            layers[nLayer].aligned = true;
        };
        /**
         *  Clear the row alignment flag for each layer
         *  @return   {number}    number of currently active layer
         *
         */
        osk.resetRowLengths = function () {
            var j, layers = osk._DivVKbd.childNodes[0].childNodes, nLayer = -1;
            for (j = 0; j < layers.length; j++) {
                if (layers[j].style.display == 'block')
                    nLayer = j;
                layers[j].aligned = false;
            }
            return nLayer;
        };
        /**
         *  Set the reference to a special function key for the
         *  currently visible OSK layer
         *
         *  @param    {number}  nLayer  Index of visible layer
         *  @param    {string}  keyId   key identifier
         *  @return   {Object}          Reference to key
         */
        osk.getSpecialKey = function (nLayer, keyId) {
            var k, layers, rows, keys;
            layers = osk._DivVKbd.childNodes[0].childNodes;
            if (nLayer >= 0 && nLayer < layers.length) {
                // Special function keys will always be in bottom row (must modify code if not)
                rows = layers[nLayer].childNodes;
                keys = rows[rows.length - 1].childNodes;
                for (k = 0; k < keys.length; k++) {
                    if (keys[k].keyId == keyId)
                        return keys[k];
                }
            }
            return null;
        };
        /**
         * Function     hide
         * Scope        Public
         * Description  Prevent display of OSK window on focus
         */
        osk['hide'] = function () {
            osk._Enabled = 0;
            osk._Hide(true);
        };
        /**
         * Hide Keymanweb On Screen Keyboard
         *
         * @param       {boolean}   hiddenByUser    Distinguish between hiding on loss of focus and explicit hiding by user
         */
        osk._Hide = function (hiddenByUser) {
            // The test for CJK languages is necessary to prevent a picklist (displayed in the OSK) from being hidden by the user
            // Once picklist functionality is separated out, this will no longer be needed.
            // Logic is: execute always if hidden on lost focus, but if requested by user, only if not CJK
            // Save current size if visible
            if (osk._Box && osk._Box.style.display == 'block' && osk._DivVKbd) {
                osk.width = osk._DivVKbd.offsetWidth;
                osk.height = osk._DivVKbd.offsetHeight;
            }
            if (hiddenByUser) {
                //osk.loadCookie(); // preserve current offset and userlocated state
                osk._Enabled = ((keymanweb.keyboardManager.isCJK() || device.touchable) ? 1 : 0); // I3363 (Build 301)
                osk.saveCookie(); // Save current OSK state, size and position (desktop only)
            }
            else if (device.formFactor == 'desktop') {
                //Allow desktop OSK to remain visible on blur if body class set
                if (document.body.className.indexOf('osk-always-visible') >= 0)
                    return;
            }
            osk._Visible = 0;
            if (osk._Box && device.touchable && osk._Box.offsetHeight > 0) // I3363 (Build 301)
             {
                var os = osk._Box.style, h = osk._Box.offsetHeight;
                //Firefox doesn't transition opacity if start delay is explicitly set to 0!
                if (typeof (os.MozBoxSizing) == 'string')
                    os.transition = 'opacity 0.8s linear';
                else
                    os.transition = os.msTransition = os.WebkitTransition = 'opacity 0.5s linear 0';
                // Cannot hide the OSK smoothly using a transitioned drop, since for
                // position:fixed elements transitioning is incompatible with translate3d(),
                // and also does not work with top, bottom or height styles.
                // Opacity can be transitioned and is probably the simplest alternative.
                // We must condition on osk._Visible in case focus has since been moved to another
                // input (in which case osk._Visible will be non-zero)
                window.setTimeout(function () {
                    var os = osk._Box.style;
                    if (osk._Visible) {
                        // Leave opacity alone and clear transition if another element activated
                        os.transition = os.msTransition = os.MozTransition = os.WebkitTransition = '';
                    }
                    else {
                        // Set opacity to zero, should decrease smoothly
                        os.opacity = '0';
                        // Actually hide the OSK at the end of the transition
                        osk._Box.addEventListener('transitionend', osk.hideNow, false);
                        osk._Box.addEventListener('webkitTransitionEnd', osk.hideNow, false);
                    }
                }, 200); // Wait a bit before starting, to allow for moving to another element
            }
            else {
                if (osk._Box)
                    osk._Box.style.display = 'none';
            }
            // Allow UI to execute code when hiding the OSK
            var p = {};
            p['HiddenByUser'] = hiddenByUser;
            osk.doHide(p);
            // If hidden by the UI, be sure to restore the focus
            if (hiddenByUser)
                keymanweb.domManager.focusLastActiveElement();
        };
        /**
         * Function     hideNow
         * Scope        Private
         * Description  Hide the OSK unconditionally and immediately, cancel any pending transition
         */
        osk.hideNow = function () {
            osk._Box.removeEventListener('transitionend', osk.hideNow, false);
            osk._Box.removeEventListener('webkitTransitionEnd', osk.hideNow, false);
            var os = osk._Box.style;
            os.display = 'none';
            os.opacity = '1';
            osk._Visible = 0;
            os.transition = os.msTransition = os.mozTransition = os.WebkitTransition = '';
            // Remove highlighting from hide keyboard key, if applied
            if (osk.hkKey && typeof (osk.hkKey) != 'undefined')
                osk.highlightKey(osk.hkKey.firstChild, false);
        };
        // First time initialization of OSK
        osk.prepare = function () {
            // Defer loading the OSK until KMW code initialization complete
            if (!keymanweb['initialized']) {
                window.setTimeout(osk.prepare, 200);
                return;
            }
            // OSK initialization - create DIV and set default styles
            if (!osk.ready) {
                osk._Box = util._CreateElement('DIV'); // Container for OSK (Help DIV, displayed when user clicks Help icon)
                document.body.appendChild(osk._Box);
                // Install the default OSK stylesheet
                util.linkStyleSheet(keymanweb.getStyleSheetPath('kmwosk.css'));
                // For mouse click to prevent loss of focus
                util.attachDOMEvent(osk._Box, 'mousedown', function () { keymanweb.uiManager.setActivatingUI(true); });
                // And to prevent touch event default behaviour on mobile devices
                // TODO: are these needed, or do they interfere with other OSK event handling ????
                if (device.touchable) // I3363 (Build 301)
                 {
                    var cancelEventFunc = function (e) {
                        if (e.cancelable) {
                            e.preventDefault();
                        }
                        e.stopPropagation();
                        return false;
                    };
                    util.attachDOMEvent(osk._Box, 'touchstart', function (e) {
                        keymanweb.uiManager.setActivatingUI(true);
                        return cancelEventFunc(e);
                    });
                    util.attachDOMEvent(osk._Box, 'touchend', cancelEventFunc);
                    util.attachDOMEvent(osk._Box, 'touchmove', cancelEventFunc);
                    util.attachDOMEvent(osk._Box, 'touchcancel', cancelEventFunc);
                    // Can only get (initial) viewport scale factor after page is fully loaded!
                    osk.vpScale = util.getViewportScale();
                }
            }
            osk.loadCookie();
            osk.ready = true;
        };
        /**
         * Function     _Load
         * Scope        Private
         * Description  OSK initialization when keyboard selected
         */
        osk._Load = function () {
            var activeKeyboard = keymanweb.keyboardManager.activeKeyboard;
            // If _Load called before OSK is ready, must wait and call again
            if (osk._Box == null) {
                if (osk.loadRetry >= 99)
                    return; // fail silently, but should not happen
                window.setTimeout(osk._Load, 100);
                osk.loadRetry++;
                return;
            }
            osk.loadRetry = 0;
            if (keymanweb._TitleElement)
                keymanweb._TitleElement.innerHTML = 'KeymanWeb'; // I1972
            osk._Visible = 0; // I3363 (Build 301)
            osk.layerId = 'default';
            var s = osk._Box.style;
            s.zIndex = '9999';
            s.display = 'none';
            s.width = 'auto';
            s.position = (device.formFactor == 'desktop' ? 'absolute' : 'fixed');
            // Use smaller base font size for mobile devices
            //if(screen.availHeight < 500) s.fontSize='10pt';
            //else if(screen.availHeight < 800) s.fontSize='11pt';
            //else s.fontSize='12pt';
            // Set scaling for mobile devices here.
            if (device.touchable) {
                var fontScale = 1;
                if (device.formFactor == 'phone') {
                    fontScale = 1.6 * (keymanweb.isEmbedded ? 0.65 : 0.6) * 1.2; // Combines original scaling factor with one previously applied to the layer group.
                }
                else {
                    // The following is a *temporary* fix for small format tablets, e.g. PendoPad
                    var pixelRatio = 1;
                    if (device.OS == 'Android' && 'devicePixelRatio' in window) {
                        pixelRatio = window.devicePixelRatio;
                    }
                    if (device.OS == 'Android' && device.formFactor == 'tablet' && parseInt(osk.getHeight(), 10) < 300 * pixelRatio) {
                        fontScale *= 1.2;
                    }
                    else {
                        fontScale *= 2; //'2.5em';
                    }
                }
                // Finalize the font size parameter.
                s.fontSize = fontScale + 'em';
            }
            osk._DivVKbd = osk._DivVKbdHelp = null; // I1476 - Handle SELECT overlapping
            osk._Box.innerHTML = '';
            osk._Box.onmouseover = osk._VKbdMouseOver;
            osk._Box.onmouseout = osk._VKbdMouseOut;
            // TODO: find out and document why this should not be done for touch devices!!
            // (Probably to avoid having a null keyboard. But maybe that *is* an option, if there remains a way to get the language menu,
            //  such as a minimized menu button?)
            if (activeKeyboard == null && !device.touchable) {
                var Ldiv = util._CreateElement('DIV');
                Ldiv.className = "kmw-title-bar";
                Ldiv.appendChild(osk._TitleBarInterior());
                Ldiv.onmousedown = osk._VMoveMouseDown;
                osk._Box.appendChild(Ldiv);
                Ldiv = util._CreateElement('DIV');
                Ldiv.className = 'kmw-osk-none';
                osk._Box.appendChild(Ldiv);
            }
            else {
                var Lviskbd = null, layouts = null, layout = null, Lhelp = '';
                osk._Box.className = "";
                if (activeKeyboard != null) {
                    Lviskbd = activeKeyboard['KV'];
                    Lhelp = activeKeyboard['KH'];
                    // Check if dynamic layout is defined within keyboard
                    layouts = activeKeyboard['KVKL'];
                    // If any keyboard layout file is provided, use that to override the generated layout
                    if (typeof layouts != 'undefined' && layouts != null) {
                        layout = layouts[device.formFactor];
                        // Use the layout for the device, if defined, otherwise use the desktop (default) layout
                        if (typeof layout == 'undefined' || layout == null) {
                            if (device.formFactor == 'phone')
                                layout = layouts['tablet'];
                            else if (device.formFactor == 'tablet')
                                layout = layouts['phone'];
                            if (typeof layout == 'undefined' || layout == null)
                                layout = layouts['desktop'];
                        }
                    }
                }
                // Test if Visual keyboard is simply a place holder, set to null if so
                if (Lviskbd != null && Lviskbd['BK'] != null) {
                    var keyCaps = Lviskbd['BK'], noKeyCaps = true;
                    {
                        for (var i = 0; i < keyCaps.length; i++) {
                            if (keyCaps[i].length > 0) {
                                noKeyCaps = false;
                                break;
                            }
                        }
                    }
                    if (noKeyCaps)
                        Lviskbd = null;
                }
                // Generate a visual keyboard from the layout (or layout default)
                // TODO: this should probably be unconditional now
                if (Lviskbd != null || Lhelp == '' || device.touchable) // I3363 (Build 301)
                 {
                    // TODO: May want to define a default BK array here as well
                    if (Lviskbd == null)
                        Lviskbd = { 'F': 'Tahoma', 'BK': dfltText }; //DDOSK
                    osk._GenerateVisualKeyboard(Lviskbd, Lhelp, layout, keymanweb.keyboardManager.getKeyboardModifierBitmask());
                }
                else //The following code applies only to preformatted 'help' such as European Latin
                 {
                    osk.ddOSK = false;
                    Ldiv = util._CreateElement('DIV');
                    Ldiv.className = "kmw-title-bar";
                    Ldiv.appendChild(osk._TitleBarInterior());
                    Ldiv.onmousedown = osk._VMoveMouseDown;
                    osk._Box.appendChild(Ldiv);
                    //Add content
                    var Ldiv = util._CreateElement('DIV');
                    Ldiv.className = 'kmw-osk-static';
                    Ldiv.innerHTML = Lhelp;
                    osk._Box.appendChild(Ldiv);
                    if (activeKeyboard['KHF'])
                        activeKeyboard['KHF'](osk._Box);
                }
                if (keymanweb._TitleElement) {
                    keymanweb._TitleElement.innerHTML = "<span style='font-weight:bold'>"
                        + activeKeyboard['KN'] + '</span> - ' + keymanweb._TitleElement.innerHTML; // I1972  // I2186
                    keymanweb._TitleElement.className = '';
                    keymanweb._TitleElement.style.color = '#fff';
                }
            }
            // Create the key preview (for phones)
            osk.createKeyTip();
            // Correct the classname for the (inner) OSK frame (Build 360)
            var innerFrame = osk._Box.firstChild, kbdClass = ' kmw-keyboard-' + (activeKeyboard ? activeKeyboard['KI'].replace('Keyboard_', '') : '');
            if (innerFrame.id == 'keymanweb_title_bar')
                innerFrame = innerFrame.nextSibling;
            innerFrame.className = 'kmw-osk-inner-frame' + kbdClass;
            // Append a stylesheet for this keyboard for keyboard specific styles
            // or if needed to specify an embedded font
            osk.appendStyleSheet();
            if (osk._Enabled)
                osk._Show();
        };
        /**
         *  Append a style sheet for the current keyboard if needed for specifying an embedded font
         *  or to re-apply the default element font
         *
         **/
        osk.appendStyleSheet = function () {
            var activeKeyboard = keymanweb.keyboardManager.activeKeyboard;
            var activeStub = keymanweb.keyboardManager.activeStub;
            // Do not do anything if a null stub
            if (activeStub == null) {
                return;
            }
            // First remove any existing keyboard style sheet
            if (osk.styleSheet) {
                util.removeStyleSheet(osk.styleSheet);
            }
            var i, kfd = activeStub['KFont'], ofd = activeStub['KOskFont'];
            // Add style sheets for embedded fonts if necessary (each font-face style will only be added once)
            util.addFontFaceStyleSheet(kfd);
            util.addFontFaceStyleSheet(ofd);
            // Temporarily hide duplicated elements on non-desktop browsers
            keymanweb.hideInputs();
            // Build the style string and append (or replace) the font style sheet
            // Note: Some browsers do not download the font-face font until it is applied,
            //       so must apply style before testing for font availability
            // Extended to allow keyboard-specific custom styles for Build 360
            var customStyle = osk.addFontStyle(kfd, ofd);
            if (activeKeyboard != null && typeof (activeKeyboard['KCSS']) == 'string') // KMEW-129
                customStyle = customStyle + activeKeyboard['KCSS'];
            osk.styleSheet = util.addStyleSheet(customStyle); //Build 360
            // Wait until font is loaded then align duplicated input elements with page elements
            if (osk.waitForFonts(kfd, ofd)) {
                keymanweb.alignInputs();
            }
        };
        /**
         *  Add or replace the style sheet used to set the font for input elements and OSK
         *
         *  @param  {Object}  kfd   KFont font descriptor
         *  @param  {Object}  ofd   OSK font descriptor (if any)
         *  @return {string}
         *
         **/
        osk.addFontStyle = function (kfd, ofd) {
            // Get name of font to be applied
            var fn = keymanweb.baseFont;
            if (typeof (kfd) != 'undefined' && typeof (kfd['family']) != 'undefined')
                fn = kfd['family'];
            // Unquote font name in base font (if quoted)
            fn = fn.replace(/\u0022/g, '');
            // Set font family chain for mapped elements and remove any double quotes
            var rx = new RegExp('\\s?' + fn + ',?'), ff = keymanweb.appliedFont.replace(/\u0022/g, '');
            // Remove base font name from chain if present
            ff = ff.replace(rx, '');
            ff = ff.replace(/,$/, '');
            // Then replace it at the head of the chain
            if (ff == '')
                ff = fn;
            else
                ff = fn + ',' + ff;
            // Re-insert quotes around individual font names
            ff = '"' + ff.replace(/\,\s?/g, '","') + '"';
            // Add to the stylesheet, quoted, and with !important to override any explicit style
            var s = '.keymanweb-font{\nfont-family:' + ff + ' !important;\n}\n';
            // Set font family for OSK text
            if (typeof (ofd) != 'undefined')
                s = s + '.kmw-key-text{\nfont-family:"' + ofd['family'].replace(/\u0022/g, '').replace(/,/g, '","') + '";\n}\n';
            else if (typeof (kfd) != 'undefined')
                s = s + '.kmw-key-text{\nfont-family:"' + kfd['family'].replace(/\u0022/g, '').replace(/,/g, '","') + '";\n}\n';
            // Store the current font chain (with quote-delimited font names)
            keymanweb.appliedFont = ff;
            // Return the style string
            return s;
        };
        /**
         * Function     _Unload
         * Scope        Private
         * Description  Clears OSK variables prior to exit (JMD 1.9.1 - relocation of local variables 3/9/10)
         */
        osk._Unload = function () {
            osk._VShift = osk._DivVKbd = osk._VKeySpans = osk._Box = 0;
        };
        /**
         * Save size, position, font size and visibility of OSK
         */
        osk.saveCookie = function () {
            var c = util.loadCookie('KeymanWeb_OnScreenKeyboard');
            var p = osk.getPos();
            c['visible'] = osk._Enabled ? 1 : 0;
            c['userSet'] = osk.userPositioned ? 1 : 0;
            c['left'] = p.left;
            c['top'] = p.top;
            if (osk._DivVKbd) {
                c['width'] = osk.width;
                c['height'] = osk.height;
            }
            util.saveCookie('KeymanWeb_OnScreenKeyboard', c);
        };
        /**
         * Restore size, position, font size and visibility of desktop OSK
         *
         *  @return {boolean}
         */
        osk.loadCookie = function () {
            var c = util.loadCookie('KeymanWeb_OnScreenKeyboard');
            if (typeof (c) == 'undefined' || c == null) {
                osk.userPositioned = false;
                return false;
            }
            osk._Enabled = util.toNumber(c['visible'], true);
            osk.userPositioned = util.toNumber(c['userSet'], false);
            osk.x = util.toNumber(c['left'], -1);
            osk.y = util.toNumber(c['top'], -1);
            // Restore OSK size - font size now fixed in relation to OSK height, unless overridden (in em) by keyboard
            var dfltWidth = 0.3 * screen.width;
            //if(util.toNumber(c['width'],0) == 0) dfltWidth=0.5*screen.width;
            var newWidth = util.toNumber(c['width'], dfltWidth), newHeight = util.toNumber(c['height'], 0.15 * screen.height);
            // Limit the OSK dimensions to reasonable values
            if (newWidth < 0.2 * screen.width)
                newWidth = 0.2 * screen.width;
            if (newHeight < 0.1 * screen.height)
                newHeight = 0.1 * screen.height;
            if (newWidth > 0.9 * screen.width)
                newWidth = 0.9 * screen.width;
            if (newHeight > 0.5 * screen.height)
                newHeight = 0.5 * screen.height;
            if (osk._DivVKbd) {
                osk._DivVKbd.style.width = newWidth + 'px';
                osk._DivVKbd.style.height = newHeight + 'px';
                osk._DivVKbd.style.fontSize = (newHeight / 8) + 'px';
            }
            // and OSK position if user located
            if (osk.x == -1 || osk.y == -1 || (!osk._Box))
                osk.userPositioned = false;
            if (osk.x < window.pageXOffset - 0.8 * newWidth)
                osk.x = window.pageXOffset - 0.8 * newWidth;
            if (osk.y < 0) {
                osk.x = -1;
                osk.y = -1;
                osk.userPositioned = false;
            }
            if (osk.userPositioned && osk._Box)
                osk.setPos({ 'left': osk.x, 'top': osk.y });
            return true;
        };
        osk.getWidthFromCookie = function () {
            var c = util.loadCookie('KeymanWeb_OnScreenKeyboard');
            if (typeof (c) == 'undefined' || c == null) {
                return screen.width * 0.3;
            }
            // Restore OSK size - font size now fixed in relation to OSK height, unless overridden (in em) by keyboard
            var newWidth = util.toNumber(c['width'], 0.3 * screen.width); // Default - 30% of screen's width.
            if (newWidth < 0.2 * screen.width) {
                newWidth = 0.2 * screen.width;
            }
            else if (newWidth > 0.9 * screen.width) {
                newWidth = 0.9 * screen.width;
            }
            return newWidth;
        };
        osk.getFontSizeFromCookie = function () {
            var c = util.loadCookie('KeymanWeb_OnScreenKeyboard');
            if (typeof (c) == 'undefined' || c == null) {
                return 16;
            }
            var newHeight = util.toNumber(c['height'], 0.15 * screen.height);
            if (newHeight > 0.5 * screen.height) {
                newHeight = 0.5 * screen.height;
            }
            return (newHeight / 8);
        };
    })();
}
// References the base KMW object.
/// <reference path="kmwbase.ts" />
var com;
(function (com) {
    var keyman;
    (function (keyman_7) {
        var RotationState = /** @class */ (function () {
            function RotationState() {
                this.innerWidth = window.innerWidth;
                this.innerHeight = window.innerHeight;
            }
            RotationState.prototype.equals = function (other) {
                return this.innerWidth == other.innerWidth && this.innerHeight == other.innerHeight;
            };
            return RotationState;
        }());
        // Please reference /testing/rotation-events/index.html and update it as necessary when maintaining this class.
        var RotationManager = /** @class */ (function () {
            // --------------------
            function RotationManager(keyman) {
                // Tracks the number of idle 'update' iterations since the last permutation.
                this.idlePermutationCounter = RotationManager.IDLE_PERMUTATION_CAP;
                this.keyman = keyman;
            }
            RotationManager.prototype.resolve = function () {
                this.keyman.alignInputs();
                var osk = this.keyman.osk;
                osk.hideLanguageList();
                osk._Load();
                if (this.oskVisible) {
                    osk._Show();
                }
                this.isActive = false;
                // If we've been using an update interval loop, we should clear the state information.
                if (this.updateTimer) {
                    window.clearInterval(this.updateTimer);
                    this.rotState = null;
                }
            };
            // Used by both Android and iOS.
            RotationManager.prototype.initNewRotation = function () {
                this.oskVisible = this.keyman.osk.isVisible();
                this.keyman.osk.hideNow();
                this.isActive = true;
            };
            /**
             * Establishes rotation-oriented event handling for native-mode KeymanWeb.  At this time, tablet PCs are not directly supported.
             */
            RotationManager.prototype.init = function () {
                // If we're in embedded mode, we really should NOT run this method.
                if (this.keyman.isEmbedded) {
                    return;
                }
                // Note:  we use wrapper functions instead of `.bind(this)` in this method to facilitate stubbing for our rotation test page.
                var os = this.keyman.util.device.OS;
                var util = this.keyman.util;
                var rotationManager = this;
                if (os == 'iOS') {
                    /* iOS is rather inconsistent about these events, with changes to important window state information -
                     * especially to `window.innerWidth` - possible after the events trigger!  They don't always trigger
                     * the same amount or in a consistently predictable manner.
                     *
                     * The overall idea is to wait out all those changes so that we don't produce a bad keyboard layout.
                     */
                    util.attachDOMEvent(window, 'orientationchange', function () {
                        rotationManager.iOSEventHandler();
                        return false;
                    });
                    util.attachDOMEvent(window, 'resize', function () {
                        rotationManager.iOSEventHandler();
                        return false;
                    });
                }
                else if (os == 'Android') {
                    // Android's far more consistent with its event generation than iOS.
                    if ('onmozorientationchange' in screen) {
                        util.attachDOMEvent(screen, 'mozorientationchange', function () {
                            rotationManager.initNewRotation();
                            return false;
                        });
                    }
                    else {
                        util.attachDOMEvent(window, 'orientationchange', function () {
                            rotationManager.initNewRotation();
                            return false;
                        });
                    }
                    util.attachDOMEvent(window, 'resize', function () {
                        rotationManager.resolve();
                        return false;
                    });
                }
            };
            RotationManager.prototype.iOSEventHandler = function () {
                if (!this.isActive) {
                    this.initNewRotation();
                    this.rotState = new RotationState();
                    this.updateTimer = window.setInterval(this.iOSEventUpdate.bind(this), RotationManager.UPDATE_INTERVAL);
                }
                // If one of the rotation-oriented events just triggered, we should ALWAYS reset the counter.
                this.idlePermutationCounter = 0;
            };
            RotationManager.prototype.iOSEventUpdate = function () {
                var newState = new RotationState();
                if (this.rotState.equals(newState)) {
                    if (++this.idlePermutationCounter == RotationManager.IDLE_PERMUTATION_CAP) {
                        this.resolve();
                    }
                }
                else {
                    this.rotState = newState;
                    this.idlePermutationCounter = 0;
                }
            };
            // iOS-oriented members 
            // --------------------
            // We'll assume permutations are complete after this many 'update' iterations.
            RotationManager.IDLE_PERMUTATION_CAP = 15;
            RotationManager.UPDATE_INTERVAL = 20; // 20 ms, that is.
            return RotationManager;
        }());
        keyman_7.RotationManager = RotationManager;
    })(keyman = com.keyman || (com.keyman = {}));
})(com || (com = {}));
// Includes KMW string extension declarations.
/// <reference path="kmwstring.ts" />
// Contains event management for mobile device rotation events.
/// <reference path="kmwrotation.ts" />
/***
   KeymanWeb 11.0
   Copyright 2019 SIL International
***/
// If KMW is already initialized, the KMW script has been loaded more than once. We wish to prevent resetting the 
// KMW system, so we use the fact that 'initialized' is only 1 / true after all scripts are loaded for the initial
// load of KMW.
if (!window['keyman']['initialized']) {
    /*****************************************/
    /*                                       */
    /*   On-Screen (Visual) Keyboard Code    */
    /*                                       */
    /*****************************************/
    (function () {
        // Declare KeymanWeb object
        var keymanweb = window['keyman'], osk = keymanweb['osk'], util = keymanweb['util'], device = util.device;
        var dbg = keymanweb.debug;
        // Force full initialization
        keymanweb.isEmbedded = false;
        /**
         * Set default device options
         * @param {Object}  opt device options object
         */
        keymanweb.setDefaultDeviceOptions = function (opt) {
            // Element attachment type
            if (opt['attachType'] == '')
                opt['attachType'] = (device.touchable ? 'manual' : 'auto');
        };
        /**
           * Customized wait display
           *
           * @param   {string|boolean}   s       displayed text (or false)
           */
        util.wait = function (s) {
            // Keyboards loaded with page are initialized before the page is ready,
            // so cannot use the wait indicater (and don't need it, anyway)
            // Do not display if a blocking cloud server error has occurred (to prevent multiple errors)
            var bg = this.waiting;
            if (typeof (bg) == 'undefined' || bg == null || keymanweb.warned) {
                return;
            }
            var nn = bg.firstChild.childNodes;
            if (s) {
                bg.pending = true;
                window.setTimeout(function () {
                    if (bg.pending) {
                        window.scrollTo(0, 0);
                        nn[0].style.display = 'none';
                        nn[1].className = 'kmw-wait-text';
                        nn[1].innerHTML = s;
                        nn[2].style.display = 'block';
                        bg.style.display = 'block';
                    }
                }, 1000);
            }
            else {
                if (bg.pending) {
                    nn[1].innerHTML = '';
                    bg.pending = false;
                    bg.style.display = 'none';
                }
            }
        };
        // Get default style sheet path
        keymanweb.getStyleSheetPath = function (ssName) {
            var ssPath = util['getOption']('resources') + 'osk/' + ssName;
            return ssPath;
        };
        /**
         * Get keyboard path (relative or absolute)
         * KeymanWeb 2 revised keyboard location specification:
         *  (a) absolute URL (includes ':') - load from specified URL
         *  (b) relative URL (starts with /, ./, ../) - load with respect to current page
         *  (c) filename only (anything else) - prepend keyboards option to URL
         *      (e.g. default keyboards option will be set by Cloud)
         *
         * @param {string}  Lfilename  keyboard file name with optional prefix
         */
        keymanweb.getKeyboardPath = function (Lfilename) {
            var rx = RegExp('^(([\\.]/)|([\\.][\\.]/)|(/))|(:)');
            return (rx.test(Lfilename) ? '' : keymanweb.options['keyboards']) + Lfilename;
        };
        /**
         * Get (uncached) keyboard context for a specified range, relative to caret
         *
         * @param       {number}      n       Number of characters to move back from caret
         * @param       {number}      ln      Number of characters to return
         * @param       {Object}      Pelem   Element to work with (must be currently focused element)
         * @return      {string}              Context string
         *
         * Example     [abcdef|ghi] as INPUT, with the caret position marked by |:
         *             KC(2,1,Pelem) == "e"
         *             KC(3,3,Pelem) == "def"
         *             KC(10,10,Pelem) == "XXXXabcdef"  i.e. return as much as possible of the requested string, where X = \uFFFE
         */
        keymanweb.KC_ = function (n, ln, Pelem) {
            var Ldv, tempContext = '';
            if (Pelem.body) {
                var Ldoc = Pelem;
            }
            else {
                var Ldoc = Pelem.ownerDocument; // I1481 - use Ldoc to get the ownerDocument when no selection is found
            }
            if (device.touchable) {
                tempContext = keymanweb.touchAliasing.getTextBeforeCaret(Pelem);
            }
            else if (Ldoc && (Ldv = Ldoc.defaultView) && Ldv.getSelection &&
                (Ldoc.designMode.toLowerCase() == 'on' || Pelem.contentEditable == 'true' || Pelem.contentEditable == 'plaintext-only' || Pelem.contentEditable === '')) {
                // I2457 - support contentEditable elements in mozilla, webkit
                /* Mozilla midas html editor and editable elements */
                var Lsel = Ldv.getSelection();
                if (Lsel.focusNode.nodeType == 3) {
                    tempContext = Lsel.focusNode.substringData(0, Lsel.focusOffset);
                }
            }
            else if (Pelem.setSelectionRange) {
                /* Mozilla other controls */
                var LselectionStart, LselectionEnd;
                if (Pelem._KeymanWebSelectionStart) {
                    LselectionStart = Pelem._KeymanWebSelectionStart;
                    LselectionEnd = Pelem._KeymanWebSelectionEnd;
                    //KeymanWeb._Debug('KeymanWeb.KC: _KeymanWebSelectionStart=TRUE LselectionStart='+LselectionStart+'; LselectionEnd='+LselectionEnd);
                }
                else {
                    if (keymanweb._CachedSelectionStart === null || Pelem.selectionStart !== keymanweb._LastCachedSelection) { // I3319, KMW-1
                        keymanweb._LastCachedSelection = Pelem.selectionStart; // KMW-1
                        keymanweb._CachedSelectionStart = Pelem.value._kmwCodeUnitToCodePoint(Pelem.selectionStart); // I3319
                        keymanweb._CachedSelectionEnd = Pelem.value._kmwCodeUnitToCodePoint(Pelem.selectionEnd); // I3319
                    }
                    LselectionStart = keymanweb._CachedSelectionStart; // I3319
                    LselectionEnd = keymanweb._CachedSelectionEnd; // I3319           
                }
                tempContext = Pelem.value._kmwSubstr(0, LselectionStart);
            }
            if (tempContext._kmwLength() < n) {
                tempContext = Array(n - tempContext._kmwLength() + 1).join("\uFFFE") + tempContext;
            }
            return tempContext._kmwSubstr(-n)._kmwSubstr(0, ln);
        };
        /**
         * Align input fields (should not be needed with KMEI, KMEA), making them visible if previously hidden.
         *
         *  @param  {object}   eleList    A list of specific elements to align.  If nil, selects all elements.
         *
         **/
        keymanweb.alignInputs = function (eleList) {
            if (device.touchable) {
                var domManager = keymanweb.domManager;
                var processList = [];
                if (eleList) {
                    // Did the user specify the actual element or the touch-alias?
                    eleList.forEach(function (element) {
                        if (element.base) {
                            // It's a touch-alias element, which is what we wish to perform alignment on.
                            processList.push(element);
                        }
                        else {
                            // This retrieves an element's touch-alias, should it exist.
                            var touchAlias = element['kmw_ip'];
                            if (touchAlias) {
                                processList.push(element['kmw_ip']);
                            }
                        }
                    });
                }
                else {
                    processList = domManager.inputList;
                }
                // Supported by IE 9 and all modern browsers.
                processList.forEach(function (element) {
                    domManager.touchHandlers.updateInput(element);
                    element.style.visibility = 'visible';
                    if (element.base.textContent.length > 0) {
                        element.base.style.visibility = 'hidden';
                    }
                });
            }
        };
        /**
         * Programatically hides all input fields with underlying elements.  Restore with .alignInputs.
         *
         *  @param  {boolean}   align    align and make visible, else hide
         *
         **/
        keymanweb.hideInputs = function () {
            var domManager = keymanweb.domManager;
            if (device.touchable) {
                for (var i = 0; i < domManager.inputList.length; i++) {
                    domManager.inputList[i].style.visibility = 'hidden';
                    domManager.inputList[i].base.style.visibility = 'visible';
                }
            }
        };
        /**
         * Test if caret position is determined from the active element, or
         * from the synthesized overlay element (touch devices)
         *
         * @return  {boolean}
         **/
        keymanweb.isPositionSynthesized = function () {
            return device.touchable;
        };
        // Manage popup key highlighting 
        osk.highlightSubKeys = function (k, x, y) {
            // Test for subkey array, return if none
            if (k == null || k.subKeys == null)
                return;
            // Highlight key at touch position (and clear other highlighting) 
            var i, sk, x0, y0, x1, y1, onKey, skBox = document.getElementById('kmw-popup-keys');
            // Show popup keys immediately if touch moved up towards key array (KMEW-100, Build 353)
            if ((osk.touchY - y > 5) && skBox == null) {
                if (osk.subkeyDelayTimer)
                    window.clearTimeout(osk.subkeyDelayTimer);
                osk.showSubKeys(k);
                skBox = document.getElementById('kmw-popup-keys');
            }
            for (i = 0; i < k.subKeys.length; i++) {
                try {
                    sk = skBox.childNodes[i].firstChild;
                    x0 = util._GetAbsoluteX(sk);
                    y0 = util._GetAbsoluteY(sk); //-document.body.scrollTop;
                    x1 = x0 + sk.offsetWidth;
                    y1 = y0 + sk.offsetHeight;
                    onKey = (x > x0 && x < x1 && y > y0 && y < y1);
                    osk.highlightKey(sk, onKey);
                    if (onKey)
                        osk.highlightKey(k, false);
                }
                catch (ex) { }
            }
        };
        osk.optionKey = function (e, keyName, keyDown) {
            if (keyDown) {
                if (keyName.indexOf('K_LOPT') >= 0)
                    osk.showLanguageMenu();
                else if (keyName.indexOf('K_ROPT') >= 0) {
                    keymanweb.uiManager.setActivatingUI(false);
                    osk._Hide(true);
                    keymanweb.touchAliasing.hideCaret();
                    keymanweb.domManager.clearLastActiveElement();
                }
            }
        };
        /**
         *  Create a key preview element for phone devices
         */
        osk.createKeyTip = function () {
            if (device.formFactor == 'phone') {
                if (osk.keytip == null) {
                    osk.keytip = util._CreateElement('div');
                    osk.keytip.className = 'kmw-keytip';
                    osk.keytip.id = 'kmw-keytip';
                    // The following style is critical, so do not rely on external CSS
                    osk.keytip.style.pointerEvents = 'none';
                    // Add CANVAS element for outline and SPAN for key label
                    osk.keytip.appendChild(util._CreateElement('canvas'));
                    osk.keytip.appendChild(util._CreateElement('span'));
                    osk.keytip.key = null;
                    osk.keytip.state = false;
                }
                // Always append to _Box (since cleared during OSK Load) 
                osk._Box.appendChild(osk.keytip);
            }
        };
        /**
         * Add (or remove) the keytip preview (if KeymanWeb on a phone device)
         *
         * @param   {Object}  key   HTML key element
         * @param   {boolean} on    show or hide
         */
        osk.showKeyTip = function (key, on) {
            var tip = osk.keytip;
            // Do not change the key preview unless key or state has changed
            if (tip == null || (key == tip.key && on == tip.state))
                return;
            var sk = document.getElementById('kmw-popup-keys'), popup = (sk && sk.style.visibility == 'visible');
            // Create and display the preview
            if (on && !popup) {
                var y0 = util._GetAbsoluteY(osk._Box), h0 = osk._Box.offsetHeight, xLeft = util._GetAbsoluteX(key), xTop = util._GetAbsoluteY(key), xWidth = key.offsetWidth, xHeight = key.offsetHeight, kc = key.firstChild, kcs = kc.style, kts = tip.style, ktLabel = tip.childNodes[1], ktls = ktLabel.style, edge = 0, canvas = tip.firstChild, previewFontScale = 1.8;
                // Find key text element
                for (var i = 0; i < key.childNodes.length; i++) {
                    kc = key.childNodes[i];
                    if (osk.hasClass(kc, 'kmw-key-text'))
                        break;
                }
                // Canvas dimensions must be set explicitly to prevent clipping
                canvas.width = 1.6 * xWidth;
                canvas.height = 2.3 * xHeight;
                kts.top = 'auto';
                kts.bottom = (y0 + h0 - xTop - xHeight) + 'px';
                kts.textAlign = 'center';
                kts.overflow = 'visible';
                kts.fontFamily = util.getStyleValue(kc, 'font-family');
                kts.width = canvas.width + 'px';
                kts.height = canvas.height + 'px';
                var px = util.getStyleInt(kc, 'font-size');
                if (px != 0) {
                    var popupFS = previewFontScale * px;
                    kts.fontSize = popupFS + 'px';
                    var textWidth = com.keyman.OSKKey.getTextWidth(ktLabel.textContent, kts);
                    // We use a factor of 0.9 to serve as a buffer in case of mild measurement error.
                    var proportion = canvas.width * 0.9 / (textWidth);
                    // Prevent the preview from overrunning its display area.
                    if (proportion < 1) {
                        kts.fontSize = (popupFS * proportion) + 'px';
                    }
                }
                ktLabel.textContent = kc.textContent;
                ktls.display = 'block';
                ktls.position = 'absolute';
                ktls.textAlign = 'center';
                ktls.width = '100%';
                ktls.top = '2%';
                ktls.bottom = 'auto';
                // Adjust canvas shape if at edges
                var xOverflow = (canvas.width - xWidth) / 2;
                if (xLeft < xOverflow) {
                    edge = -1;
                    xLeft += xOverflow;
                }
                else if (xLeft > window.innerWidth - xWidth - xOverflow) {
                    edge = 1;
                    xLeft -= xOverflow;
                }
                osk.drawPreview(canvas, xWidth, xHeight, edge);
                kts.left = (xLeft - xOverflow) + 'px';
                kts.display = 'block';
            }
            // Hide the key preview
            else {
                tip.style.display = 'none';
            }
            // Save the key preview state
            tip.key = key;
            tip.state = on;
        };
        /**
         * Draw key preview in element using CANVAS
         *  @param  {Object}  canvas CANVAS element
         *  @param  {number}  w width of touched key, px
         *  @param  {number}  h height of touched key, px
         *  @param  {number}  edge  -1 left edge, 1 right edge, else 0
         */
        osk.drawPreview = function (canvas, w, h, edge) {
            var ctx = canvas.getContext('2d'), dx = (canvas.width - w) / 2, hMax = canvas.height, w0 = 0, w1 = dx, w2 = w + dx, w3 = w + 2 * dx, h1 = 0.5 * hMax, h2 = 0.6 * hMax, h3 = hMax, r = 8;
            if (device.OS == 'Android') {
                r = 3;
            }
            // Adjust the preview shape at the edge of the keyboard
            switch (edge) {
                case -1:
                    w1 -= dx;
                    w2 -= dx;
                    break;
                case 1:
                    w1 += dx;
                    w2 += dx;
                    break;
            }
            // Clear the canvas
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            // Define appearance of preview (cannot be done directly in CSS)
            if (device.OS == 'Android') {
                var wx = (w1 + w2) / 2;
                w1 = w2 = wx;
                ctx.fillStyle = '#999';
            }
            else {
                ctx.fillStyle = '#ffffff';
            }
            ctx.lineWidth = '1';
            ctx.strokeStyle = '#cccccc';
            // Draw outline
            ctx.save();
            ctx.beginPath();
            ctx.moveTo(w0 + r, 0);
            ctx.arcTo(w3, 0, w3, r, r);
            if (device.OS == 'Android') {
                ctx.arcTo(w3, h1, w2, h2, r);
                ctx.arcTo(w2, h2, w1, h2, r);
                ctx.arcTo(w1, h2, w0, h1 - r, r);
            }
            else {
                ctx.arcTo(w3, h1, w2, h2, r);
                ctx.arcTo(w2, h2, w2 - r, h3, r);
                ctx.arcTo(w2, h3, w1, h3, r);
                ctx.arcTo(w1, h3, w1, h2 - r, r);
                ctx.arcTo(w1, h2, w0, h1 - r, r);
            }
            ctx.arcTo(w0, h1, w0, r, r);
            ctx.arcTo(w0, 0, w0 + r, 0, r);
            ctx.fill();
            ctx.stroke();
            ctx.restore();
        };
        /**
         * Add a callout for popup keys (if KeymanWeb on a phone device)
         *
         * @param   {Object}  key   HTML key element
         * @return  {Object}        callout object
         */
        osk.addCallout = function (key) {
            if (device.formFactor != 'phone' || device.OS != 'iOS')
                return null;
            var cc = util._CreateElement('div'), ccs = cc.style;
            cc.id = 'kmw-popup-callout';
            osk._Box.appendChild(cc);
            // Create the callout
            var xLeft = key.offsetLeft, xTop = key.offsetTop, xWidth = key.offsetWidth, xHeight = key.offsetHeight;
            // Set position and style 
            ccs.top = (xTop - 6) + 'px';
            ccs.left = xLeft + 'px';
            ccs.width = xWidth + 'px';
            ccs.height = (xHeight + 6) + 'px';
            // Return callout element, to allow removal later
            return cc;
        };
        /**
         * Touch hold key display management
         *
         * @param   {Object}  key   base key object
         */
        osk.touchHold = function (key) {
            // Clear and restart the popup timer
            if (osk.subkeyDelayTimer) {
                window.clearTimeout(osk.subkeyDelayTimer);
                osk.subkeyDelayTimer = null;
            }
            if (typeof key.subKeys != 'undefined' && key.subKeys != null) {
                osk.subkeyDelayTimer = window.setTimeout(function () {
                    osk.clearPopup();
                    osk.showSubKeys(key);
                }, osk.popupDelay);
            }
        };
        /**
         * Use rotation events to adjust OSK and input element positions and scaling as necessary
         */
        keymanweb.handleRotationEvents = function () {
            var rotationManager = new com.keyman.RotationManager(keymanweb);
            rotationManager.init();
        };
        /**
         * Possible way to detect the start of a rotation and hide the OSK before it is adjusted in size
         *
         *  @param  {Object}    e   accelerometer rotation event
         *
        keymanweb.testRotation = function(e)
        {
          var r=e.rotationRate;
          if(typeof(r) != 'undefined')
          {
            dbg(r.alpha+' '+r.beta+' '+r.gamma);
          }
        }
        */
        /**
         * Wait until font is loaded before applying stylesheet - test each 100 ms
         * @param   {Object}  kfd   main font descriptor
         * @param   {Object}  ofd   secondary font descriptor (OSK only)
         * @return  {boolean}
         */
        osk.waitForFonts = function (kfd, ofd) {
            if (typeof (kfd) == 'undefined' && typeof (ofd) == 'undefined')
                return true;
            if (typeof (kfd['files']) == 'undefined' && typeof (ofd['files']) == 'undefined')
                return true;
            var kReady = util.checkFontDescriptor(kfd), oReady = util.checkFontDescriptor(ofd);
            if (kReady && oReady)
                return true;
            keymanweb.fontCheckTimer = window.setInterval(function () {
                if (util.checkFontDescriptor(kfd) && util.checkFontDescriptor(ofd)) {
                    window.clearInterval(keymanweb.fontCheckTimer);
                    keymanweb.fontCheckTimer = null;
                    keymanweb.alignInputs();
                }
            }, 100);
            // Align anyway as best as can if font appears to remain uninstalled after 5 seconds   
            window.setTimeout(function () {
                if (keymanweb.fontCheckTimer) {
                    window.clearInterval(keymanweb.fontCheckTimer);
                    keymanweb.fontCheckTimer = null;
                    keymanweb.alignInputs();
                    // Don't notify - this is a management issue, not anything the user needs to deal with
                    // TODO: Consider having an icon in the OSK with a bubble that indicates missing font
                    //util.alert('Unable to download the font normally used with '+ks['KN']+'.');
                }
            }, 5000);
            return false;
        };
    })();
}
/***
   KeymanWeb 11.0
   Copyright 2019 SIL International
***/
if (!window['keyman']['initialized']) {
    window['keyman']['dfltLayout'] = {
        "desktop": {
            "font": "Tahoma,Helvetica",
            "layer": [
                {
                    "id": "default",
                    "row": [
                        {
                            "id": "1",
                            "key": [
                                { "id": "K_BKQUOTE" },
                                { "id": "K_1" },
                                { "id": "K_2" },
                                { "id": "K_3" },
                                { "id": "K_4" },
                                { "id": "K_5" },
                                { "id": "K_6" },
                                { "id": "K_7" },
                                { "id": "K_8" },
                                { "id": "K_9" },
                                { "id": "K_0" },
                                { "id": "K_HYPHEN" },
                                { "id": "K_EQUAL" },
                                { "id": "K_BKSP", "text": "*BkSp*", "sp": "1", "width": "130" }
                            ]
                        },
                        {
                            "id": "2",
                            "key": [
                                { "id": "K_TAB", "text": "*Tab*", "sp": "1", "width": "130" },
                                { "id": "K_Q" },
                                { "id": "K_W" },
                                { "id": "K_E" },
                                { "id": "K_R" },
                                { "id": "K_T" },
                                { "id": "K_Y" },
                                { "id": "K_U" },
                                { "id": "K_I" },
                                { "id": "K_O" },
                                { "id": "K_P" },
                                { "id": "K_LBRKT" },
                                { "id": "K_RBRKT" },
                                { "id": "K_BKSLASH" }
                            ]
                        },
                        {
                            "id": "3",
                            "key": [
                                { "id": "K_CAPS", "text": "*Caps*", "sp": "1", "width": "165" },
                                { "id": "K_A" },
                                { "id": "K_S" },
                                { "id": "K_D" },
                                { "id": "K_F" },
                                { "id": "K_G" },
                                { "id": "K_H" },
                                { "id": "K_J" },
                                { "id": "K_K" },
                                { "id": "K_L" },
                                { "id": "K_COLON" },
                                { "id": "K_QUOTE" },
                                { "id": "K_ENTER", "text": "*Enter*", "sp": "1", "width": "165" }
                            ]
                        },
                        {
                            "id": "4",
                            "key": [
                                { "id": "K_SHIFT", "text": "*Shift*", "sp": "1", "width": "130" },
                                { "id": "K_oE2" },
                                { "id": "K_Z" },
                                { "id": "K_X" },
                                { "id": "K_C" },
                                { "id": "K_V" },
                                { "id": "K_B" },
                                { "id": "K_N" },
                                { "id": "K_M" },
                                { "id": "K_COMMA" },
                                { "id": "K_PERIOD" },
                                { "id": "K_SLASH" },
                                { "id": "K_RSHIFT", "text": "*Shift*", "sp": "1", "width": "130" }
                            ]
                        },
                        {
                            "id": "5",
                            "key": [
                                { "id": "K_LCONTROL", "text": "*Ctrl*", "sp": "1", "width": "170" },
                                { "id": "K_LALT", "text": "*Alt*", "sp": "1", "width": "160" },
                                { "id": "K_SPACE", "text": "", "width": "770" },
                                { "id": "K_RALT", "text": "*Alt*", "sp": "1", "width": "160" },
                                { "id": "K_RCONTROL", "text": "*Ctrl*", "sp": "1", "width": "170" }
                            ]
                        }
                    ]
                }
            ]
        },
        "tablet": {
            "font": "Tahoma,Helvetica",
            "layer": [
                {
                    "id": "default",
                    "row": [
                        {
                            "id": "0",
                            "key": [
                                { "id": "K_1" },
                                { "id": "K_2" },
                                { "id": "K_3" },
                                { "id": "K_4" },
                                { "id": "K_5" },
                                { "id": "K_6" },
                                { "id": "K_7" },
                                { "id": "K_8" },
                                { "id": "K_9" },
                                { "id": "K_0" },
                                { "id": "K_HYPHEN" },
                                { "id": "K_EQUAL" },
                                { "sp": "10", "width": "1" }
                            ]
                        },
                        {
                            "id": "1",
                            "key": [
                                { "id": "K_Q", "pad": "25" },
                                { "id": "K_W" },
                                { "id": "K_E" },
                                { "id": "K_R" },
                                { "id": "K_T" },
                                { "id": "K_Y" },
                                { "id": "K_U" },
                                { "id": "K_I" },
                                { "id": "K_O" },
                                { "id": "K_P" },
                                { "id": "K_LBRKT" },
                                { "id": "K_RBRKT" },
                                { "sp": "10", "width": "1" }
                            ]
                        },
                        {
                            "id": "2",
                            "key": [
                                { "id": "K_A", "pad": "50" },
                                { "id": "K_S" },
                                { "id": "K_D" },
                                { "id": "K_F" },
                                { "id": "K_G" },
                                { "id": "K_H" },
                                { "id": "K_J" },
                                { "id": "K_K" },
                                { "id": "K_L" },
                                { "id": "K_COLON" },
                                { "id": "K_QUOTE" },
                                { "id": "K_BKSLASH", "width": "90" }
                            ]
                        },
                        {
                            "id": "3",
                            "key": [
                                { "id": "K_oE2", "width": "90" },
                                { "id": "K_Z" },
                                { "id": "K_X" },
                                { "id": "K_C" },
                                { "id": "K_V" },
                                { "id": "K_B" },
                                { "id": "K_N" },
                                { "id": "K_M" },
                                { "id": "K_COMMA" },
                                { "id": "K_PERIOD" },
                                { "id": "K_SLASH" },
                                { "id": "K_BKQUOTE" },
                                { "sp": "10", "width": "1" }
                            ]
                        },
                        {
                            "id": "4",
                            "key": [
                                {
                                    "id": "K_SHIFT", "text": "*Shift*", "sp": "1", "width": "200", "sk": [
                                        { "id": "K_LCONTROL", "text": "*Ctrl*", "sp": "1", "width": "50", "nextlayer": "ctrl" },
                                        { "id": "K_LCONTROL", "text": "*LCtrl*", "sp": "1", "width": "50", "nextlayer": "leftctrl" },
                                        { "id": "K_RCONTROL", "text": "*RCtrl*", "sp": "1", "width": "50", "nextlayer": "rightctrl" },
                                        { "id": "K_LALT", "text": "*Alt*", "sp": "1", "width": "50", "nextlayer": "alt" },
                                        { "id": "K_LALT", "text": "*LAlt*", "sp": "1", "width": "50", "nextlayer": "leftalt" },
                                        { "id": "K_RALT", "text": "*RAlt*", "sp": "1", "width": "50", "nextlayer": "rightalt" },
                                        { "id": "K_ALTGR", "text": "*AltGr*", "sp": "1", "width": "50", "nextlayer": "ctrl-alt" }
                                    ]
                                },
                                { "id": "K_LOPT", "text": "*Menu*", "sp": "1", "width": "150" },
                                { "id": "K_SPACE", "text": "", "width": "570" },
                                { "id": "K_BKSP", "text": "*BkSp*", "sp": "1", "width": "150" },
                                { "id": "K_ENTER", "text": "*Enter*", "sp": "1", "width": "200" }
                            ]
                        }
                    ]
                }
            ]
        },
        "phone": {
            "font": "Tahoma,Helvetica",
            "layer": [
                {
                    "id": "default",
                    "row": [
                        {
                            "id": "0",
                            "key": [
                                { "id": "K_1" },
                                { "id": "K_2" },
                                { "id": "K_3" },
                                { "id": "K_4" },
                                { "id": "K_5" },
                                { "id": "K_6" },
                                { "id": "K_7" },
                                { "id": "K_8" },
                                { "id": "K_9" },
                                { "id": "K_0" },
                                { "id": "K_HYPHEN" },
                                { "id": "K_EQUAL" },
                                { "sp": "10", "width": "1" }
                            ]
                        },
                        {
                            "id": "1",
                            "key": [
                                { "id": "K_Q", "pad": "25" },
                                { "id": "K_W" },
                                { "id": "K_E" },
                                { "id": "K_R" },
                                { "id": "K_T" },
                                { "id": "K_Y" },
                                { "id": "K_U" },
                                { "id": "K_I" },
                                { "id": "K_O" },
                                { "id": "K_P" },
                                { "id": "K_LBRKT" },
                                { "id": "K_RBRKT" },
                                { "sp": "10", "width": "1" }
                            ]
                        },
                        {
                            "id": "2",
                            "key": [
                                { "id": "K_A", "pad": "50" },
                                { "id": "K_S" },
                                { "id": "K_D" },
                                { "id": "K_F" },
                                { "id": "K_G" },
                                { "id": "K_H" },
                                { "id": "K_J" },
                                { "id": "K_K" },
                                { "id": "K_L" },
                                { "id": "K_COLON" },
                                { "id": "K_QUOTE" },
                                { "id": "K_BKSLASH", "width": "90" }
                            ]
                        },
                        {
                            "id": "3",
                            "key": [
                                { "id": "K_oE2", "width": "90" },
                                { "id": "K_Z" },
                                { "id": "K_X" },
                                { "id": "K_C" },
                                { "id": "K_V" },
                                { "id": "K_B" },
                                { "id": "K_N" },
                                { "id": "K_M" },
                                { "id": "K_COMMA" },
                                { "id": "K_PERIOD" },
                                { "id": "K_SLASH" },
                                { "id": "K_BKQUOTE" },
                                { "sp": "10", "width": "1" }
                            ]
                        },
                        {
                            "id": "4",
                            "key": [
                                {
                                    "id": "K_SHIFT", "text": "*Shift*", "sp": "1", "width": "200", "sk": [
                                        { "id": "K_LCONTROL", "text": "*Ctrl*", "sp": "1", "width": "50", "nextlayer": "ctrl" },
                                        { "id": "K_LCONTROL", "text": "*LCtrl*", "sp": "1", "width": "50", "nextlayer": "leftctrl" },
                                        { "id": "K_RCONTROL", "text": "*RCtrl*", "sp": "1", "width": "50", "nextlayer": "rightctrl" },
                                        { "id": "K_LALT", "text": "*Alt*", "sp": "1", "width": "50", "nextlayer": "alt" },
                                        { "id": "K_LALT", "text": "*LAlt*", "sp": "1", "width": "50", "nextlayer": "leftalt" },
                                        { "id": "K_RALT", "text": "*RAlt*", "sp": "1", "width": "50", "nextlayer": "rightalt" },
                                        { "id": "K_ALTGR", "text": "*AltGr*", "sp": "1", "width": "50", "nextlayer": "ctrl-alt" }
                                    ]
                                },
                                { "id": "K_LOPT", "text": "*Menu*", "width": "150", "sp": "1" },
                                { "id": "K_SPACE", "width": "570", "text": "" },
                                { "id": "K_BKSP", "text": "*BkSp*", "width": "150", "sp": "1" },
                                { "id": "K_ENTER", "text": "*Enter*", "width": "200", "sp": "1" }
                            ]
                        }
                    ]
                }
            ]
        }
    };
}
/***
   KeymanWeb 11.0
   Copyright 2019 SIL International
***/
/********************************************************/
/*                                                      */
/* Automatically initialize keymanweb with defaults     */
/* after the page is fully loaded                       */
/*                                                      */
/********************************************************/
(function () {
    // Declare KeymanWeb object
    var keymanweb = window['keyman'];
    // We don't want to instantly init() in case this code is used via bookmarklet.
    var readyStateCheckInterval = window.setInterval(function () {
        if (document.readyState === "complete") {
            window.clearInterval(readyStateCheckInterval);
            keymanweb.init(null);
        }
    }, 10);
})();
/* Prevents the unneeded deps.js SCRIPT auto-inject when doing uncompiled tests.

 * Because of how TypeScript's <reference/> tag works, this must be in its own file and declared above
 * goog/base.js in order to prevent unfortunate side-effects from occuring.  We don't need the functionality
 * that the Closure library tries to import otherwise.
 */
var CLOSURE_NO_DEPS = true;
/// <reference path="closure.ts" />
/// <reference path="kmwbase.ts" />
/// <reference path="kmwutils.ts" />
/// <reference path="kmwcallback.ts" />
/**
 * This file generates aliases linking renamed functions to some of our published developer API for KMW.
 * This won't enable Closure to do "advanced minification", but it's useful for ensuring we don't break
 * things people depended on in legacy versions.
 */
// Util.ts
(function () {
    var prototype = com.keyman.Util.prototype;
    var publishAPI = function (miniName, longName) {
        prototype[miniName] = prototype[longName];
    };
    publishAPI('getAbsoluteX', "_GetAbsoluteX");
    publishAPI("getAbsoluteY", "_GetAbsoluteY");
    publishAPI("getAbsolute", "_GetAbsolute");
    publishAPI("toNzString", "nzString");
}());
// Keyboard callbacks
(function () {
    var prototype = com.keyman.KeyboardInterface.prototype;
    var exportKBCallback = function (miniName, longName) {
        prototype[miniName] = prototype[longName];
    };
    exportKBCallback('KSF', 'saveFocus');
    exportKBCallback('KBR', 'beepReset');
    exportKBCallback('KT', 'insertText');
    exportKBCallback('KR', 'registerKeyboard');
    exportKBCallback('KRS', 'registerStub');
    exportKBCallback('KC', 'context');
    exportKBCallback('KN', 'nul');
    exportKBCallback('KCM', 'contextMatch');
    exportKBCallback('KFCM', 'fullContextMatch');
    exportKBCallback('KIK', 'isKeypress');
    exportKBCallback('KKM', 'keyMatch');
    exportKBCallback('KSM', 'stateMatch');
    exportKBCallback('KKI', 'keyInformation');
    exportKBCallback('KDM', 'deadkeyMatch');
    exportKBCallback('KB', 'beep');
    exportKBCallback('KA', 'any');
    exportKBCallback('KDC', 'deleteContext');
    exportKBCallback('KO', 'output');
    exportKBCallback('KDO', 'deadkeyOutput');
    exportKBCallback('KIO', 'indexOutput');
    exportKBCallback('KIFS', 'ifStore');
    exportKBCallback('KSETS', 'setStore');
    exportKBCallback('KLOAD', 'loadStore');
    exportKBCallback('KSAVE', 'saveStore');
}());
//# sourceMappingURL=keymanweb.js.map