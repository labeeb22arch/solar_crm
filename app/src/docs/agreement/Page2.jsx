
export const Page2 = ({ data, fontSizeClass = 'ag-fs-17' }) => {
  return (
    <div className={`ag-page ${fontSizeClass}`}>
      
      {/* First Party Undertakings (Numbered 1-6) */}
      <div className="ag-sy4 ag-mb6 ag-justify ag-normal">
        <div className="ag-item">
          <span className="ag-normal ag-num ag-num22">1.</span>
          <div className="ag-flex1">
            Submission of online application at National Portal for installation of RTS project/system, Submission of application for net-metering and system inspection and upload of the relevant documents on the National Portal of the scheme
          </div>
        </div>

        <div className="ag-item">
          <span className="ag-normal ag-num ag-num22">2.</span>
          <div className="ag-flex1">
            Provide secure storage of the material of the RTS plant delivered at the premises till handover of the system.
          </div>
        </div>

        <div className="ag-item">
          <span className="ag-normal ag-num ag-num22">3.</span>
          <div className="ag-flex1">
            Provide access to the Roof Top during installation of the plant, operation & maintenance, testing of the plant and equipment and for meter reading from solar meter, inverter etc.
          </div>
        </div>

        <div className="ag-item">
          <span className="ag-normal ag-num ag-num22">4.</span>
          <div className="ag-flex1">
            Provide electricity during plant installation and water for cleaning of the panels.
          </div>
        </div>

        <div className="ag-item">
          <span className="ag-normal ag-num ag-num22">5.</span>
          <div className="ag-flex1">
            Report any malfunctioning of the plant to the Vendor during the warranty period.
          </div>
        </div>

        <div className="ag-item">
          <span className="ag-normal ag-num ag-num22">6.</span>
          <div className="ag-flex1">
            Pay the amount as per the payment schedule as mutually agreed with the vendor, including any additional amount to the second party for any additional work /customization required depending upon the building condition
          </div>
        </div>
      </div>

      {/* Second Party Undertakings Header */}
      <div className="ag-mb4 ag-pt2">
        <p className="ag-bold ag-underline ag-justify">
          The Second Party hereby undertakes to perform the following activities:
        </p>
      </div>

      {/* Second Party Undertakings (1-3) */}
      <div className="ag-sy5 ag-justify ag-normal">
        <div className="ag-item">
          <span className="ag-normal ag-num ag-num22">1.</span>
          <div className="ag-flex1">
            The Vendor must follow all the standards and safety guidelines prescribed under state regulations and technical standards prescribed by MNRE for RTS projects, failing which the vendor is liable for blacklisting from participation in the govt. project/ scheme and other penal actions in accordance with the law. The responsibility of supply, installation and commissioning of the rooftop solar project/system in complete compliance with MNRE scheme guidelines lies with the Vendor.
          </div>
        </div>

        <div className="ag-item">
          <span className="ag-normal ag-num ag-num22">2.</span>
          <div className="ag-flex1">
            <span className="ag-semibold">Site Survey:</span> Site visit, survey and development of detailed project report for installation of RTS system. This also includes, feasibility study of roof, strength of roof and shadow free area. If any additional work or customization is involved for the plant installation as per site condition and requirement of the consumer building, the Vendor shall prepare an estimate and can raise separate invoice including GST in addition to the amount towards standard plant cost. The consumer shall pay the amount for such additional work directly to the Vendor.
          </div>
        </div>

        <div className="ag-item">
          <span className="ag-normal ag-num ag-num22">3.</span>
          <div className="ag-flex1">
            <span className="ag-semibold">Design & Engineering:</span> Design of plant along with drawings and selection of components as per standard provided by the DISCOM/SERC/MNRE for best performance and safety of the plant.
          </div>
        </div>
      </div>

      {/* Page Footer */}
      <div className="ag-footer">
        <div className="ag-footer-text">
          <div>Guidelines for PM-Surya Ghar: Muft Bijli Yojana</div>
          <div>Central Financial Assistance to Residential Consumers</div>
        </div>
        <span className="ag-normal ag-footer-no">23</span>
      </div>
    </div>
  );
};
