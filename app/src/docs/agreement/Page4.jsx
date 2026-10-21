
export const Page4 = ({ data, fontSizeClass = 'ag-fs-17' }) => {
  const getHighlightStyle = () => ({
    backgroundColor: data.showHighlights ? data.highlightColor : 'transparent',
    paddingLeft: '2px',
    paddingRight: '2px',
    borderRadius: '2px',
  });

  return (
    <div className={`ag-page ${fontSizeClass}`}>
      
      {/* Second Party Undertakings (13-18) */}
      <div className="ag-sy35 ag-justify ag-mb4 ag-normal">
        <div className="ag-item">
          <span className="ag-normal ag-num ag-num24">13.</span>
          <div className="ag-flex1">
            <span className="ag-semibold">Insurance:</span> Any insurance cost pertaining to material transfer/storage before commissioning of the system shall be in the scope of the vendor.
          </div>
        </div>

        <div className="ag-item">
          <span className="ag-normal ag-num ag-num24">14.</span>
          <div className="ag-flex1">
            <span className="ag-semibold">Applicable Standard:</span> The system must meet the technical standards and specifications notified by MNRE. The vendor is solely responsible to supply component and service which meets the technical standards and specification prescribed by MNRE and State DISCOMs.
          </div>
        </div>

        <div className="ag-item">
          <span className="ag-normal ag-num ag-num24">15.</span>
          <div className="ag-flex1">
            <span className="ag-semibold">Project/system cost & payment terms:</span> The cost of the plant and payment schedule should be mutually discussed and decided between the vendor and consumer. The consumer may opt for milestone-based payment to the vendor and the same shall be included in the agreement.
          </div>
        </div>

        <div className="ag-item">
          <span className="ag-normal ag-num ag-num24">16.</span>
          <div className="ag-flex1">
            <span className="ag-semibold">Dispute:</span> In-case of any dispute between consumer and vendor (in supply/installation/maintenance of system or payment terms), both parties must settle the same mutually or as per law. MNRE/DISCOM shall not be liable for, and would not be a party to any dispute arising between vendor and consumer.
          </div>
        </div>

        <div className="ag-item">
          <span className="ag-normal ag-num ag-num24">17.</span>
          <div className="ag-flex1">
            <span className="ag-semibold">Subsidy / Project Related Documents:</span> Vendor must provide all the documents to consumer and help in uploading the same to National Portal for smooth release of subsidy.
          </div>
        </div>

        <div className="ag-item">
          <span className="ag-normal ag-num ag-num24">18.</span>
          <div className="ag-flex1">
            <span className="ag-semibold">Performance of Plant:</span> The Performance Ratio (PR) of Plant must be 75% at the time of commissioning of the project by DISCOM or its authorised agency. Vendor must provide (returnable basis) radiation sensor with valid calibration certificate of any NABL / International laboratory at the time of commissioning / testing of the plant. Vendor must maintain the PR of the plant till warranty of project i.e. 5 years from the date of commissioning.
          </div>
        </div>

        <div className="ag-item ag-pt1">
          <span className="ag-normal ag-num ag-num24">19.</span>
          <div className="ag-flex1">
            <span className="ag-normal">{data.paymentTerms || 'Mutually Agreed Terms of Payment …'}</span>
          </div>
        </div>
      </div>

      {/* Execution Signatures Table / Columns */}
      <div className="ag-mt4 ag-pt2">
        <div className="ag-parties ag-normal">
          
          {/* First Party (Consumer) Column */}
          <div className="ag-sy3">
            <div className="ag-party-head">First Party</div>
            
            <div>
              <span className="ag-semibold">Name: </span>
              <span className="ag-normal" style={getHighlightStyle()}>
                {data.consumerName || ''}
              </span>
            </div>

            <div>
              <span className="ag-semibold">Address </span>
              <span>Vill: </span>
              <span className="ag-normal" style={getHighlightStyle()}>{data.village || ''}</span>
              <span> Tal: </span>
              <span className="ag-normal" style={getHighlightStyle()}>{data.taluka || ''}</span>
              <span> Dist: </span>
              <span className="ag-normal" style={getHighlightStyle()}>{data.district || ''}</span>
            </div>

            {/* Signature Box */}
            <div className="ag-pt2">
              <span className="ag-semibold ag-block ag-mb1">SIGN:</span>
              {data.firstPartySignature || data.signatureUrl ? (
                <div className="ag-signbox ag-signrow">
                  <img 
                    src={data.firstPartySignature || data.signatureUrl} 
                    alt="Consumer Signature" 
                    className="ag-contain ag-custsign" 
                  />
                </div>
              ) : (
                <div 
                  className="ag-signbox"
                  style={{ backgroundColor: data.showHighlights ? (data.highlightColor || '#fef08a') : 'transparent' }}
                />
              )}
            </div>

            <div className="ag-pt2">
              <span className="ag-semibold">Date-</span>
              <span className="ag-normal" style={getHighlightStyle()}>
                {data.executionDate || ''}
              </span>
            </div>
          </div>

          {/* Second Party (Vendor) Column */}
          <div className="ag-sy3">
            <div className="ag-party-head">Second Party</div>

            <div>
              <span className="ag-semibold">Name - </span>
              <span className="ag-normal">{data.vendorName || ''}</span>
            </div>

            <div>
              <span className="ag-semibold">Address- </span>
              <span className="ag-normal">{data.vendorAddress || ''}</span>
            </div>

            {/* Vendor Stamp & Signature Box - Enlarged by 30% and shifted center-right */}
            <div className="ag-pt2">
              <span className="ag-semibold ag-block ag-mb1">Stamp & Sign:</span>
              {data.secondPartyStamp || data.stampUrl || data.secondPartySignature || data.vendorSignatureUrl ? (
                <div className="ag-signbox ag-signrow ag-stamprow" style={{ marginTop: '20px' }}>
                  {(data.secondPartyStamp || data.stampUrl) && (
                  <img 
                    src={data.secondPartyStamp || data.stampUrl} 
                    alt="Vendor Stamp" 
                    className="ag-contain" 
                    style={{ maxHeight: '134px', maxWidth: '390px' }}
                  />
                  )}
                  {(data.secondPartySignature || data.vendorSignatureUrl) && (
                    <img 
                      src={data.secondPartySignature || data.vendorSignatureUrl} 
                      alt="Vendor Sign" 
                      className="ag-contain ag-vendsign" 
                    />
                  )}
                </div>
              ) : (
                <div className="ag-signbox" />
              )}
            </div>

            <div className="ag-pt2 ag-right">
              <span className="ag-semibold">Date:</span>
              <span className="ag-normal" style={getHighlightStyle()}>
                {data.executionDate || ''}
              </span>
            </div>

          </div>

        </div>
      </div>

      {/* Page Footer */}
      <div className="ag-footer">
        <div className="ag-footer-text">
          <div>Guidelines for PM-Surya Ghar: Muft Bijli Yojana</div>
          <div>Central Financial Assistance to Residential Consumers</div>
        </div>
        <span className="ag-normal ag-footer-no">25</span>
      </div>
    </div>
  );
};
