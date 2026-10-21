
export const Page1 = ({ data, fontSizeClass = 'ag-fs-17' }) => {
  const getHighlightStyle = () => ({
    backgroundColor: data.showHighlights ? data.highlightColor : 'transparent',
    paddingLeft: '2px',
    paddingRight: '2px',
    borderRadius: '2px',
  });

  return (
    <div className={`ag-page ${fontSizeClass}`}>
      {/* Document Top Title Section */}
      <div className="ag-center ag-mb6 ag-sy3">
        <p className="ag-annex">Annexure 2</p>
        
        <h1 className="ag-title">
          Model Draft Agreement between Consumer & Vendor for installation of grid connected rooftop solar (RTS) project under PM – Surya Ghar: Muft Bijli Yojana
        </h1>
      </div>

      {/* Execution Date Intro */}
      <div className="ag-mb6">
        <p className="ag-justify ag-normal">
          This agreement is executed on{' '}
          <span className="ag-normal" style={getHighlightStyle()}>
            {data.executionDate || ''}
          </span>{' '}
          for design, supply, installation, commissioning and 5-year comprehensive maintenance of RTS project/system along with warranty under PM Surya Ghar: Muft Bijli Yojana
        </p>
      </div>

      {/* Parties Section */}
      <div className="ag-sy4 ag-mb6">
        <div className="ag-center ag-bold ag-underline">Between</div>

        <p className="ag-justify ag-normal">
          <span className="ag-normal" style={getHighlightStyle()}>
            {data.consumerName || ''}
          </span>{' '}
          ,Consumer No-{' '}
          <span className="ag-normal" style={getHighlightStyle()}>
            {data.consumerNo || ''}
          </span>{' '}
          having address at Vill{' '}
          <span className="ag-normal" style={getHighlightStyle()}>
            {data.village || ''}
          </span>
          ,Tal:{' '}
          <span className="ag-normal" style={getHighlightStyle()}>
            {data.taluka || ''}
          </span>{' '}
          Dist:{' '}
          <span className="ag-normal" style={getHighlightStyle()}>
            {data.district || ''}
          </span>{' '}
          (hereinafter referred to as first Party i.e. /consumer/consumer/purchaser /owner of system).
        </p>

        <div className="ag-center ag-bold">And</div>

        <p className="ag-justify ag-normal">
          <span className="ag-normal">
            {data.vendorName || ''}
          </span>{' '}
          having registered office at{' '}
          <span className="ag-normal ag-underline">
            {data.vendorAddress || ''}
          </span>{' '}
          (hereinafter referred to as second Party i.e. Vendor/ contractor/ System Integrator).
        </p>
      </div>

      {/* Recitals / Whereas Clauses */}
      <div className="ag-sy4 ag-mb8">
        <div>
          <h2 className="ag-bold ag-mb1">Whereas</h2>
          <p className="ag-justify">
            First Party wishes to install a Grid Connected Rooftop Solar Plant on the rooftop of the residential building of the Consumer under PM Surya Ghar: Muft Bijli Yojana.
          </p>
        </div>

        <div>
          <h2 className="ag-bold ag-mb1">And whereas</h2>
          <p className="ag-justify">
            Second Party has verified availability of appropriate roof and found it feasible to install a Grid Connected Roof Top Solar plant and that the second party is willing to design, supply, install, test, commission and carry out Operation & Maintenance of the Rooftop Solar plant for 5 year period
          </p>
        </div>

        <p className="ag-justify ag-pt2">
          On this day, the First Party and Second Party agree to the following:
        </p>

        <div className="ag-pt4">
          <p className="ag-bold ag-underline ag-justify">
            The First Party hereby undertakes to perform the following activities:
          </p>
        </div>
      </div>

      {/* Page Footer */}
      <div className="ag-footer">
        <div className="ag-footer-text">
          <div>Guidelines for PM-Surya Ghar: Muft Bijli Yojana</div>
          <div>Central Financial Assistance to Residential Consumers</div>
        </div>
        <span className="ag-normal ag-footer-no">22</span>
      </div>
    </div>
  );
};
