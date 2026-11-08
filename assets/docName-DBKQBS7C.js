const c=e=>String(e||"").normalize("NFKD").replace(/[^A-Za-z0-9]+/g,"_").replace(/^_+|_+$/g,""),o=(e,a)=>`${c(e)}_${c(a)||"Customer"}`,s=(e,a)=>`${o(e,a)}.pdf`;export{o as a,s as d};
