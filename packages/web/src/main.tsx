import "@fontsource/golos-text/400.css";
import "@fontsource/golos-text/500.css";
import "@fontsource/golos-text/600.css";
import "@fontsource/unbounded/500.css";
import "@fontsource/unbounded/700.css";
import "./styles.css";
import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { I18nProvider } from "./i18n";
import { Footer, LegalPage } from "./legal";

function Root() {
  const [hash, setHash] = useState(location.hash);
  useEffect(() => {
    const onHash = () => {
      setHash(location.hash);
      window.scrollTo(0, 0);
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const doc = hash === "#privacy" ? "privacy" : hash === "#terms" ? "terms" : null;
  return (
    <>
      {doc ? <LegalPage doc={doc} /> : <App />}
      <Footer />
    </>
  );
}

createRoot(document.getElementById("root")!).render(
  <I18nProvider>
    <Root />
  </I18nProvider>,
);