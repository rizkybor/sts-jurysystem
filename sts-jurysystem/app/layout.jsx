import "@/assets/styles/global.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import AuthProvider from "@/components/AuthProvider";

export const metadata = {
  title: "Sustainable Timing",
  keywords: "timing-system, rafting, jury-penalty",
  description: "Sustainable Timing System",
};

const MainLayout = ({ children }) => {
  return (
    <AuthProvider>
      <html>
        <body>
          <Navbar></Navbar>
          <main>{children}</main>
          <Footer></Footer>
        </body>
      </html>
    </AuthProvider>
  );
};

export default MainLayout;
