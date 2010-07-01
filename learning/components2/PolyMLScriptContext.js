/*Components.utils.import("resource://gre/modules/XPCOMUtils.jsm");  

/*********************************************************** 
class definition 
***********************************************************/  
  
//class constructor  
function PolyMLDOMjs() {  
	// If you only need to access your component from Javascript, uncomment the following line:  
	//this.wrappedJSObject = this;  
}
  
// class definition  
PolyMLDOMjs.prototype = {  
  
  // properties required for XPCOM registration:  
  classDescription: "My Hello World Javascript XPCOM Component",  
  classID:          Components.ID("{02b943c1-afc7-4e16-9e5e-f82af0b30582}"),  
  contractID:       "@ed.ac.uk/polymlext;1",  
  
  // [optional] custom factory (an object implementing nsIFactory). If not  
  // provided, the default factory is used, which returns  
  // |(new MyComponent()).QueryInterface(iid)| in its createInstance().  
  //_xpcom_factory: { ... },  
  
  // [optional] an array of categories to register this component in.  
  //_xpcom_categories: [{  
  
    // Each object in the array specifies the parameters to pass to  
    // nsICategoryManager.addCategoryEntry(). 'true' is passed for both  
    // aPersist and aReplace params.  
    //category: "some-category",  
  
    // optional, defaults to the object's classDescription  
    //entry: "application/x-polyml",  
  
    // optional, defaults to the object's contractID (unless 'service' is specified)  
    //value: "...",  
  
    // optional, defaults to false. When set to true, and only if 'value' is not  
    // specified, the concatenation of the string "service," and the object's contractID  
    // is passed as aValue parameter of addCategoryEntry.  
     //service: true  
  //}],  
  
  // QueryInterface implementation, e.g. using the generateQI helper (remove argument if skipped steps above)  
  QueryInterface: XPCOMUtils.generateQI([Components.interfaces.nsIPolyMLDOMjs]),  
  
  // ...component implementation...  
  // define the function we want to expose in our interface  
  hello: function() {  
      return "Hello World!";  
  },  
};
var components = [PolyMLDOMjs];  
function NSGetModule(compMgr, fileSpec) {  
  return XPCOMUtils.generateModule(components);  
}  
*/

