import { ConnectionDiagnostics } from "@/components/ConnectionDiagnostics";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const ConnectionTest = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8 flex items-center justify-center">
        <ConnectionDiagnostics />
      </main>
      <Footer />
    </div>
  );
};

export default ConnectionTest;
