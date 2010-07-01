/*
 * DO NOT EDIT.  THIS FILE IS GENERATED FROM IMyComponent.idl
 */

#ifndef __gen_IMyComponent_h__
#define __gen_IMyComponent_h__


#ifndef __gen_nsISupports_h__
#include "nsISupports.h"
#endif

/* For IDL files that don't want to include root IDL files. */
#ifndef NS_NO_VTABLE
#define NS_NO_VTABLE
#endif

/* starting interface:    IMyComponent */
#define IMYCOMPONENT_IID_STR "8ebd0aeb-4808-468f-b8be-fff6e0e41063"

#define IMYCOMPONENT_IID \
  {0x8ebd0aeb, 0x4808, 0x468f, \
    { 0xb8, 0xbe, 0xff, 0xf6, 0xe0, 0xe4, 0x10, 0x63 }}

class NS_NO_VTABLE NS_SCRIPTABLE IMyComponent : public nsISupports {
 public: 

  NS_DECLARE_STATIC_IID_ACCESSOR(IMYCOMPONENT_IID)

  /* long Add (in long a, in long b); */
  NS_SCRIPTABLE NS_IMETHOD Add(PRInt32 a, PRInt32 b, PRInt32 *_retval NS_OUTPARAM) = 0;

};

  NS_DEFINE_STATIC_IID_ACCESSOR(IMyComponent, IMYCOMPONENT_IID)

/* Use this macro when declaring classes that implement this interface. */
#define NS_DECL_IMYCOMPONENT \
  NS_SCRIPTABLE NS_IMETHOD Add(PRInt32 a, PRInt32 b, PRInt32 *_retval NS_OUTPARAM); 

/* Use this macro to declare functions that forward the behavior of this interface to another object. */
#define NS_FORWARD_IMYCOMPONENT(_to) \
  NS_SCRIPTABLE NS_IMETHOD Add(PRInt32 a, PRInt32 b, PRInt32 *_retval NS_OUTPARAM) { return _to Add(a, b, _retval); } 

/* Use this macro to declare functions that forward the behavior of this interface to another object in a safe way. */
#define NS_FORWARD_SAFE_IMYCOMPONENT(_to) \
  NS_SCRIPTABLE NS_IMETHOD Add(PRInt32 a, PRInt32 b, PRInt32 *_retval NS_OUTPARAM) { return !_to ? NS_ERROR_NULL_POINTER : _to->Add(a, b, _retval); } 

#if 0
/* Use the code below as a template for the implementation class for this interface. */

/* Header file */
class _MYCLASS_ : public IMyComponent
{
public:
  NS_DECL_ISUPPORTS
  NS_DECL_IMYCOMPONENT

  _MYCLASS_();

private:
  ~_MYCLASS_();

protected:
  /* additional members */
};

/* Implementation file */
NS_IMPL_ISUPPORTS1(_MYCLASS_, IMyComponent)

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


#endif /* __gen_IMyComponent_h__ */
