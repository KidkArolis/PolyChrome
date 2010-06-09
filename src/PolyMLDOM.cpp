#define MOZILLA_STRICT_API

//#include "nsIServiceManager.h"
#include "nsCOMPtr.h"
#include "nsServiceManagerUtils.h"
#include "nsStringAPI.h"
#include "nsIConsoleService.h"

#include "PolyMLDOM.h"
#include "IPolyMLDOM.h"
#include "xpcom-config.h"
#define XPCOM_GLUE

#include <stdio.h>
#include <stdlib.h>

NS_IMPL_ISUPPORTS1(PolyMLDOM, IPolyMLDOM)

PolyMLDOM::PolyMLDOM()
{
  /* member initializers and constructor code */
}

PolyMLDOM::~PolyMLDOM()
{
  /* destructor code */
}

/* long Add (in long a, in long b); */
NS_IMETHODIMP PolyMLDOM::Add(PRInt32 a, PRInt32 b, PRInt32 *_retval NS_OUTPARAM)
{
	nsCOMPtr<nsIConsoleService> aConsoleService =
	    do_GetService( "@mozilla.org/consoleservice;1" );

	//aConsoleService->LogStringMessage(
	    //NS_LITERAL_STRING( "logging from C++" ).get());



	//return NS_ERROR_NOT_IMPLEMENTED;
	*_retval = a + b;
	//system("/home/karolis/Dropbox/msc/extension/poly/polymlext");
	return NS_OK;
}
