import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import AuthProvider from "@/components/AuthProvider";
import { ToastContainer } from "react-toastify";
import { GlobalProvider } from "@/context/globalContext";
import "react-toastify/dist/ReactToastify.css";
import "@/assets/styles/global.css";

export const metadata = {
  title: "Sustainable Timing",
  keywords: "timing-system, rafting, jury-penalty",
  description: "Sustainable Timing System",
};

const MainLayout = ({ children }) => {
  return (
    <AuthProvider>
      <GlobalProvider>
        <html>
          <body>
            <Navbar />
            <main>{children}</main>
            <Footer />
            <ToastContainer />
          </body>
        </html>
      </GlobalProvider>
    </AuthProvider>
  );
};

export default MainLayout;
