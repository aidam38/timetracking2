import { Route, Router, Routes } from "solid-app-router";
import { lazy } from "solid-js";
import { render } from "solid-js/web";

import "./assets/index.css";
import { WindowProvider } from "./context/WindowContext";

import { Auth, Login, Signup } from "./pages/Auth";
import PublicReportData from "./pages/PublicReportData";

const App = lazy(() => import("./App"));
const Home = lazy(() => import("./pages/Home"));
const Page = lazy(() => import("./pages/AppPage"));
const Track = lazy(() => import("./pages/Track"));
const Report = lazy(() => import("./pages/Report"));
const Calendar = lazy(() => import("./pages/Calendar"));
const Mobile = lazy(() => import("./pages/Mobile"));
const PublicReportPage = lazy(() => import("./pages/PublicReportPage"));
const Help = lazy(() => import("./pages/Help"));

render(() => {
  const isMobile = window.innerWidth < 768;
  return (
    <WindowProvider>
      <Router>
        <Routes>
          <Route path="/" component={Auth}>
            <Route path="/login" component={Login} />
            <Route path="/signup" component={Signup} />
          </Route>
          <Route
            path="/r/:id"
            component={PublicReportPage}
            data={PublicReportData}
          />
          {isMobile ? (
            <Route path="/" component={Mobile} />
          ) : (
            <Route path="/" component={App}>
              <Route path="/" component={Home} />
              <Route path="/" component={Page}>
                <Route path="/track" component={Track} />
                <Route path="/report" component={Report} />
                <Route path="/calendar" component={Calendar} />
                <Route path="/help" component={Help} />
              </Route>
            </Route>
          )}
        </Routes>
      </Router>
    </WindowProvider>
  );
}, document.getElementById("root") as HTMLElement);
