import Notice from "./Notice";

export default class Palissy extends Notice {
  constructor(body) {
    super(body, "palissy");
    
    if (this.DOSURL) {
      this.DOSURL = this.fixLink(this.DOSURL);
    }
    if (this.DOSURLPDF) {
      this.DOSURLPDF = this.fixLink(this.DOSURLPDF);
    }
  }
}
