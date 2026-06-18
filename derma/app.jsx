// DERMA-OS · App shell: router por hash + montaje
function useRoute() {
  const [route, setRoute] = React.useState(() => location.hash.slice(1) || "/");
  React.useEffect(() => {
    const fn = () => setRoute(location.hash.slice(1) || "/");
    window.addEventListener("hashchange", fn);
    return () => window.removeEventListener("hashchange", fn);
  }, []);
  return route;
}

const MODALS = {
  cita: NuevaCitaModal,
  citaDetalle: CitaDetalleModal,
  paciente: NuevoPacienteModal,
  receta: NuevaRecetaModal,
  evolucion: EvolucionModal,
  printRx: PrintRxModal,
  nuevoConsent: NuevoConsentModal,
  firmarConsent: FirmarConsentModal,
  servicio: ServicioModal,
  procedimiento: ProcedimientoModal,
  paquete: PaqueteModal,
  venderPaquete: VenderPaqueteModal,
  abono: AbonoModal,
  factura: FacturaModal,
  ride: RideModal,
  generarCobro: GenerarCobroModal,
  cobroDetalle: CobroDetalleModal,
  subirFoto: SubirFotoModal,
  fotoLightbox: FotoLightboxModal,
};

function Router({ route }) {
  const parts = route.split("/").filter(Boolean);
  if (parts.length === 0) return <Dashboard />;
  if (parts[0] === "agenda") return <Agenda />;
  if (parts[0] === "patients") {
    if (parts[1]) return <PatientDetail id={parts[1]} tab={parts[2] || "antecedentes"} />;
    return <PatientsList />;
  }
  if (parts[0] === "services") return <ServicesView />;
  if (parts[0] === "procedures") return <ProceduresView />;
  if (parts[0] === "packages") return <PackagesView />;
  if (parts[0] === "payments") return <PaymentsView />;
  if (parts[0] === "billing") return <BillingView />;
  if (parts[0] === "inventory") return <InventoryView />;
  if (parts[0] === "admin") return <AdminView />;
  return <Dashboard />;
}

function App() {
  const s = useStore();
  const route = useRoute();
  const contentRef = React.useRef(null);
  React.useEffect(() => { if (contentRef.current) contentRef.current.scrollTop = 0; }, [route]);
  const me = SEL.currentUser(s);
  const ModalCmp = s.modal ? MODALS[s.modal.type] : null;

  if (!me) return <LoginScreen />;

  return (
    <div className="app">
      <Sidebar route={route} />
      <div className="main">
        <Header />
        <div className="content" ref={contentRef} data-screen-label={route}>
          <Router route={route} />
        </div>
      </div>
      {ModalCmp ? <ModalCmp props={s.modal.props || {}} /> : null}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
