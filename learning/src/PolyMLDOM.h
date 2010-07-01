#ifndef _POLYMLDOM_H_
#define _POLYMLDOM_H_

#include "IPolyMLDOM.h"

#define POLYMLDOM_CONTRACTID "@mozilla.org/polymlext/polymldom;1"
#define POLYMLDOM_CLASSNAME "PolyML DOM"

/* 7f5171c4-387a-45f6-93c0-f4ea0294598c */
#define POLYMLDOM_CID { 0x7f5171c4, 0x387a, 0x45f6, \
  { 0x93, 0xc0, 0xf4, 0xea, 0x02, 0x94, 0x59, 0x8c } }

class PolyMLDOM : public IPolyMLDOM
{
public:
  NS_DECL_ISUPPORTS
  NS_DECL_IPOLYMLDOM

  PolyMLDOM();

private:
  ~PolyMLDOM();

protected:
  /* additional members */
};

#endif /* _POLYMLDOM_H_ */
