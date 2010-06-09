#include "PolyMLDOM.h"
#include "IPolyMLDOM.h"
#include "xpcom-config.h"
#define XPCOM_GLUE

//#include "nsIServiceManager.h"
//#include "nsIConsoleService.h"
//#include "nsStringAPI.h"
#include "nsCOMPtr.h"

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
	aConsoleService->LogStringMessage(
	    NS_LITERAL_STRING( "running poly" ).get());

	//return NS_ERROR_NOT_IMPLEMENTED;
	*_retval = a + b;
	int r = system("/home/karolis/Dropbox/msc/extension/poly/polymlext");
	return NS_OK;
}
