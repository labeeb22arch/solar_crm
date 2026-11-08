export default function InlineFilePreview({url,title='Document',onClose}) {
 let source=url;
 const drive=String(url).match(/^https:\/\/drive\.google\.com\/file\/d\/([^/?#]+)/);
 if(drive)source=`https://drive.google.com/file/d/${drive[1]}/preview`;
 return <section className="card card-b inline-document-editor"><button type="button" className="btn" onClick={onClose}>Close document · back to customer</button><h3>{title}</h3><iframe title={title} src={source} referrerPolicy="no-referrer" style={{width:'100%',height:'70vh',border:0}}/><p className="small faint">If the provider requires sign-in or blocks this preview, <a href={url} target="_blank" rel="noreferrer">open the original file</a>.</p></section>;
}
