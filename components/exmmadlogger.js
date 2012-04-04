/* ***** BEGIN LICENSE BLOCK *****
 *   Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is exmmad.
 *
 * The Initial Developer of the Original Code is
 * Mozilla Messaging, Inc..
 * Portions created by the Initial Developer are Copyright (C) 2009
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *   Andrew Sutherland <asutherland@asutherland.org>
 *
 * Alternatively, the contents of this file may be used under the terms of
 * either the GNU General Public License Version 2 or later (the "GPL"), or
 * the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the MPL, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the GPL or the LGPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL or the LGPL.
 *
 * ***** END LICENSE BLOCK ***** */

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cr = Components.results;
const Cu = Components.utils;

Cu.import("resource://gre/modules/XPCOMUtils.jsm");

let p = {
  WHITESPACE: "                                                              ",
  _cmap: {},

  map_fg: function(aName, aCode) {
    this._cmap[aName] = "\x1b[38;5;" + aCode + "m";
  },
  map_bg: function(aName, aCode) {
    this._cmap[aName] = "\x1b[48;g;" + aCode + "m";
  },
  map_control: function(aName, aByteStr) {
    this._cmap[aName] = "\x1b[" + aByteStr + "m";
  },

  _init_map: function() {
    this.map_control('-fg', '39');
    this.map_control('-bg', '49');

    this.map_fg('h', 127);
    // normal
    this.map_fg('n', 0xf8);
    this.map_fg('bn', 0xff);
    // error
    this.map_fg('e', 124);
    // warning
    this.map_fg('w', 220);
    // good
    this.map_fg('g',  46);

    // subtle
    this.map_fg('s', 0xee);

    // function-name (or filename, maybe)
    this.map_fg('fn', 0x4d);
    // container name/class name
    this.map_fg('cn', 0x41);

    // javascript function name
    this.map_fg('jfn', 0xc9);

    // interface name
    this.map_fg('in', 0x49);

    // script name
    this.map_fg('sn', 0x35);
    // line number
    this.map_fg('ln', 0x34);

    // example
    this.map_fg('ex', 81);

    this.map_fg('k', 129);
    this.map_fg('v', 38);
    this.map_fg('sk', 0x36);
    this.map_fg('sv', 0x18);
  },

  _init: function() {
    this._init_map();
  },

  out: function() {
    let s = "";
    let offset = 0;
    for (let i = 1; i < arguments.length; i += 2) {
      let param = arguments[i-1];
      let val = arguments[i];

      if (param != null) {
        if (typeof(param) == "number")
          s += this.WHITESPACE.substr(0, param - offset);
        else
          s += this._cmap[param];
      }



      let t = val + "";
      offset += t.length;
      s += t;
    }
    if (s[s.length - 1] === "\n")
      dump(s + this._cmap["n"]);
    else
      dump(s + this._cmap["n"] + "\n");
  }
};
p._init();

const nsIScriptError = Ci.nsIScriptError;
const nsIScriptErrorEx = Ci.nsIScriptErrorEx;

var gSingleton = null;
var ExmmadFactory = {
  createInstance: function af_ci(aOuter, aIID) {
    if (aOuter != null)
      throw Components.results.NS_ERROR_NO_AGGREGATION;

    if (gSingleton == null) {
      gSingleton = new ExmmadConsoleListener();
    }

    return gSingleton.QueryInterface(aIID);
  }
};

function ExmmadConsoleListener() {
  this.initialize();
}

ExmmadConsoleListener.prototype = {
  // for nsIClassInfo + XPCOMUtils
  classDescription: "exmmad console listener",
  classID:          Components.ID("60718f0e-5a0b-47ec-8a08-0380b14f3f80"),
  contractID:       "@mozillamessaging.com/exmmad/consolelistener;1",

  // redefine the default factory for XPCOMUtils
  _xpcom_factory: ExmmadFactory,

  // for nsISupports
  QueryInterface : XPCOMUtils.generateQI([Ci.nsIConsoleListener, Ci.nsIObserver, Ci.nsIClassInfo]),
  getInterfaces: function(aCount) {
    let interfaces = [Ci.nsIConsoleListener, Ci.nsIObserver, Ci.nsIClassInfo];
    aCount.value = interfaces.length;
    return interfaces;
  },

  initialize: function () {
    this.consoleService = Cc["@mozilla.org/consoleservice;1"]
                            .getService(Ci.nsIConsoleService);
    this.consoleService.registerListener(this);

    // we need to unregister our listener at shutdown if we don't want explosions
    this.observerService = Cc["@mozilla.org/observer-service;1"]
                             .getService(Ci.nsIObserverService);
    this.observerService.addObserver(this, "quit-application", false);
  },

  shutdown: function () {
    this.consoleService.unregisterListener(this);
    this.observerService.removeObserver(this, "quit-application");
    this.consoleService = null;
    this.observerService = null;
  },

  dumpStack: function (aFrame) {
    p.out(null, "    ", "fn", aFrame.filename, "n", ":", "ln",
          aFrame.lineNumber, 60, " ", "jfn", aFrame.name);
    if (aFrame.caller)
      this.dumpStack(aFrame.caller);
  },

  observe: function (aMessage, aTopic, aData) {
    if (aTopic == "profile-after-change")
      return;
    else if (aTopic == "quit-application") {
      this.shutdown();
      return;
    }


    try{
    if (aMessage instanceof nsIScriptError) {
      // The CSS Parser just makes my life sad.
      if (aMessage.category == "CSS Parser")
 	return;

      let colorCode, desc;
      if (aMessage.flags & nsIScriptError.warningFlag) {
        colorCode = "w";
        desc = "Warning";
      }
      else {
        colorCode = "e";
        desc = "Error";
      }

      if (aMessage.flags & nsIScriptError.strictFlag)
        desc = "Strict " + desc;
      p.out(colorCode, desc, "n", ": ", null, aMessage.errorMessage,
            "s", " [", null, aMessage.category, null, "]");

      if (nsIScriptErrorEx &&
          (aMessage instanceof nsIScriptErrorEx) &&
          aMessage.location)
        this.dumpStack(aMessage.location);
      else
        this.dumpStack({name: "(nostack)",
                        filename: aMessage.sourceName,
                        lineNumber: aMessage.lineNumber});
    }
    else {
      p.out("w", aMessage.message);
    }
      } catch (ex) {
        dump("SELF-SPLOSION: " + ex + "\n");
      }
  }
};


var components = [ExmmadConsoleListener];
var NSGetFactory = XPCOMUtils.generateNSGetFactory(components);
