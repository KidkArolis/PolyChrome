PolyChrome
----------

PolyChrome is an extension for Firefox web browser that can run SML programs
embedded in HTML documents. The extension provides a simple foreign function
interface to JavaScript. As a result, JavaScript libraries and interfaces
provided by the browser, such as DOM and Canvas, can be used in SML. 


Running the extension with the deploy script
--------------------------------------------

* Create a deploy.cfg file based on the deploy.cfg.template
* Executing

    # ./deploy

  will place a text file in your Firefox profile with the path to the source
  code of the extension. The deploy script also clears the cache/registry of the
  extensions (which is not that important in most cases). Execute
  
    # ./deploy run
    
  to immediately run Firefox (with the error console opened) after deploying the
  extension.
  
  
Documentation
-------------

[http://kidkarolis.github.com/PolyChrome/](http://kidkarolis.github.com/PolyChrome/)