/*
 * DO NOT EDIT.  THIS FILE IS GENERATED FROM IPolyMLDOM.idl
 */

#ifndef __gen_IPolyMLDOM_h__
#define __gen_IPolyMLDOM_h__


#ifndef __gen_nsISupports_h__
#include "nsISupports.h"
#endif

/* For IDL files that don't want to include root IDL files. */
#ifndef NS_NO_VTABLE
#define NS_NO_VTABLE
#endif

/* starting interface:    IPolyMLDOM */
#define IPOLYMLDOM_IID_STR "300fd938-7265-11df-8006-62e1dfd72085"

#define IPOLYMLDOM_IID \
  {0x300fd938, 0x7265, 0x11df, \
    { 0x80, 0x06, 0x62, 0xe1, 0xdf, 0xd7, 0x20, 0x85 }}

class NS_NO_VTABLE NS_SCRIPTABLE IPolyMLDOM : public nsISupports {
 public: 

  NS_DECLARE_STATIC_IID_ACCESSOR(IPOLYMLDOM_IID)

  /* long Add (in long a, in long b); */
  NS_SCRIPTABLE NS_IMETHOD Add(PRInt32 a, PRInt32 b, PRInt32 *_retval NS_OUTPARAM) = 0;

};

  NS_DEFINE_STATIC_IID_ACCESSOR(IPolyMLDOM, IPOLYMLDOM_IID)

/* Use this macro when declaring classes that implement this interface. */
#define NS_DECL_IPOLYMLDOM \
  NS_SCRIPTABLE NS_IMETHOD Add(PRInt32 a, PRInt32 b, PRInt32 *_retval NS_OUTPARAM); 

/* Use this macro to declare functions that forward the behavior of this interface to another object. */
#define NS_FORWARD_IPOLYMLDOM(_to) \
  NS_SCRIPTABLE NS_IMETHOD Add(PRInt32 a, PRInt32 b, PRInt32 *_retval NS_OUTPARAM) { return _to Add(a, b, _retval); } 

/* Use this macro to declare functions that forward the behavior of this interface to another object in a safe way. */
#define NS_FORWARD_SAFE_IPOLYMLDOM(_to) \
  NS_SCRIPTABLE NS_IMETHOD Add(PRInt32 a, PRInt32 b, PRInt32 *_retval NS_OUTPARAM) { return !_to ? NS_ERROR_NULL_POINTER : _to->Add(a, b, _retval); } 

#if 0
/* Use the code below as a template for the implementation class for this interface. */

/* Header file */
class _MYCLASS_ : public IPolyMLDOM
{
public:
  NS_DECL_ISUPPORTS
  NS_DECL_IPOLYMLDOM

  _MYCLASS_();

private:
  ~_MYCLASS_();

protected:
  /* additional members */
};

/* Implementation file */
NS_IMPL_ISUPPORTS1(_MYCLASS_, IPolyMLDOM)

_MYCLASS_::_MYCLASS_()
{
  /* member initializers and constructor code */
}

_MYCLASS_::~_MYCLASS_()
{
  /* destructor code */
}

/* long Add (in long a, in long b); */
NS_IMETHODIMP _MYCLASS_::Add(PRInt32 a, PRInt32 b, PRInt32 *_retval NS_OUTPARAM)
{
    return NS_ERROR_NOT_IMPLEMENTED;
}

/* End of implementation class template. */
#endif


#endif /* __gen_IPolyMLDOM_h__ */
