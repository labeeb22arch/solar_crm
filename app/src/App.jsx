import Finance from './pages/Finance.jsx';
import FinanceTabs from './components/FinanceTabs.jsx';
import Operations from './pages/Operations.jsx';
import FinanceTracking from './pages/FinanceTracking.jsx';
import { HashRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import Shell from './components/Shell.jsx';
import Today from './pages/Today.jsx';
import Overview from './pages/Overview.jsx';
import Projects from './pages/Projects.jsx';
import Record from './pages/Record.jsx';
import { PartnerHome, AddLead, MyCommission } from './pages/Partner.jsx';
import StampQueue from './pages/Stamp.jsx';
import NameCheck from './pages/NameCheck.jsx';
import Field from './pages/Field.jsx';
import Quotes from './pages/Quotes.jsx';
import Feasibility from './pages/Feasibility.jsx';
// import Company from './pages/Company.jsx';
import SignPage from './pages/Sign.jsx';
import {
  Inventory, BOM, Dispatch, Installs, DiscomDocs, Commissions, Warranty, Attendance, Activity, More,
} from './pages/Ops.jsx';
import { ToastProvider, useSession } from './lib/hooks.jsx';
import { PAGES, pageAllowed, homeFor } from './lib/access.js';
import { NotAllowed, NotFound } from './components/ui.jsx';
import Login, { SetNewPassword, Loading } from './pages/Login.jsx';
import Chat from './pages/Chat.jsx';
import Users from './pages/Users.jsx';
import Documents from './pages/Documents.jsx';
import Proposal from './pages/Proposal.jsx';
import MaterialsTabs from './components/MaterialsTabs.jsx';
// import ProposalSettings from './pages/ProposalSettings.jsx';

/** Every page goes through this guard: blocked pages show a friendly message, also when opened by direct URL. */
function Guard({ page, children }) {
  const s = useSession();
  if (!pageAllowed(page, s.role)) return <NotAllowed what={PAGES[page]?.label || 'This page'} role={s.role} />;
  return children;
}
function Home() {
  const s = useSession();
  return <Navigate to={homeFor(s.role)} replace />;
}
const G = (page, el) => <Guard page={page}>{el}</Guard>;

function Gate({ children }) {
  const s = useSession();
  const loc = useLocation();
  // The customer signing page is public: it renders before the sign-in check and without the app menu or top bar.
  const m = loc.pathname.match(/^\/sign\/([^/]+)\/?$/);
  if (m) return <SignPage token={decodeURIComponent(m[1])} />;
  if (s.recovery) return <SetNewPassword />;
  if (!s.user) return s.bootError ? <Loading error={s.bootError} /> : <Login />;
  if (!s.ready) return <Loading error={s.bootError} />;
  return children;
}

export default function App() {
  return (
    <ToastProvider>
      <HashRouter>
        <Gate>
        <Routes>
          <Route element={<Shell />}>
            <Route index element={<Home />} />
            <Route path="today" element={G('today', <Today />)} />
            <Route path="overview" element={G('overview', <Overview />)} />
            <Route path="projects" element={G('projects', <Projects />)} />
            <Route path="p/:id" element={G('record', <Record />)} />
            <Route path="partner" element={G('partner', <PartnerHome />)} />
            <Route path="add-lead" element={G('add_lead', <AddLead />)} />
            <Route path="my-commission" element={G('my_commission', <MyCommission />)} />
            <Route path="stamp" element={G('stamp', <StampQueue />)} />
            <Route path="name-check" element={G('name_check', <NameCheck />)} />
            <Route path="quotes" element={G('quotes', <Quotes />)} />
            <Route path="proposal" element={G('proposal', <Proposal />)} />
            <Route path="feasibility" element={G('feasibility', <Feasibility />)} />
            <Route path="field" element={G('field', <Field />)} />
            <Route path="installs" element={G('installs', <MaterialsTabs><Installs /></MaterialsTabs>)} />
            <Route path="supply" element={<Navigate to="/supply/inventory" replace />} />
            <Route path="supply/inventory" element={G('inventory', <MaterialsTabs><Inventory /></MaterialsTabs>)} />
            <Route path="supply/bom" element={G('bom', <MaterialsTabs><BOM /></MaterialsTabs>)} />
            <Route path="supply/challan" element={G('challan', <MaterialsTabs><Dispatch kind="challan" /></MaterialsTabs>)} />
            <Route path="supply/tally" element={G('tally', <Dispatch kind="tally" />)} />
            <Route path="grid" element={<Navigate to="/grid/docs" replace />} />
            <Route path="grid/docs" element={G('discom_docs', <DiscomDocs />)} />
            <Route path="operations" element={G('operations', <Operations/>)} />
            <Route path="finance" element={G('finance', <FinanceTabs><Finance/></FinanceTabs>)} />
            <Route path="finance/received" element={G('finance', <FinanceTabs><Finance/></FinanceTabs>)} />
            <Route path="finance/expected" element={G('finance', <FinanceTabs><Finance/></FinanceTabs>)} />
            <Route path="money/subsidy" element={G('subsidy_tracking', <FinanceTabs><FinanceTracking kind="subsidy" /></FinanceTabs>)} />
            <Route path="money/loans" element={G('loan_tracking', <FinanceTabs><FinanceTracking kind="loan" /></FinanceTabs>)} />
            <Route path="money" element={<Navigate to="/finance" replace />} />
            {/* <Route path="money/invoices" element={G('invoices', <Invoices />)} /> */}
            <Route path="money/cp" element={G('cp_comm', <Commissions kind="cp" />)} />
            <Route path="money/install" element={G('inst_comm', <Commissions kind="install" />)} />
            <Route path="warranty" element={G('warranty', <Warranty />)} />
            <Route path="team" element={<Navigate to="/team/attendance" replace />} />
            <Route path="team/attendance" element={G('attendance', <Attendance />)} />
            <Route path="team/users" element={G('users', <Users />)} />
            {/* <Route path="team/company" element={G('company', <Company />)} /> */}
            {/* <Route path="team/proposal-settings" element={G('proposal_settings', <ProposalSettings />)} /> */}
            {/* <Route path="company" element={<Navigate to="/team/company" replace />} /> */}
            <Route path="activity" element={G('activity', <Activity />)} />
            <Route path="chat" element={G('chat', <Chat />)} />
            <Route path="documents" element={G('documents', <Documents />)} />
            <Route path="more" element={G('more', <More />)} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
        </Gate>
      </HashRouter>
    </ToastProvider>
  );
}
