import Notice from "./Notice";

export default class Merimee extends Notice {
  constructor(body) {
    super(body, "merimee");

    if (this.TICO) {
      this.TICO = this.stripHTML(this.TICO);
    }
    if (this.DOSURL) {
      this.DOSURL = this.fixLink(this.DOSURL);
    }
    if (this.DOSURLPDF) {
      this.DOSURLPDF = this.fixLink(this.DOSURLPDF);
    }
  }
}
