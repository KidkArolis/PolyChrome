#include "nsIGenericFactory.h"
#include "PolyMLDOM.h"
#include "IPolyMLDOM.h"
#include "xpcom-config.h"
#define XPCOM_GLUE

NS_GENERIC_FACTORY_CONSTRUCTOR(PolyMLDOM)

static nsModuleComponentInfo components[] =
{
    {
       POLYMLDOM_CLASSNAME,
       POLYMLDOM_CID,
       POLYMLDOM_CONTRACTID,
       PolyMLDOMConstructor,
    }
};

NS_IMPL_NSGETMODULE("PolyMLDOMModule", components)
