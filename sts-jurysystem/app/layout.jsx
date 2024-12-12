import '@/assets/styles/global.css'
import Navbar from '@/components/Navbar';

export const metadata = {
    title: 'Sustainable-JS',
    keywords: 'timing-system, rafting, jury-penalty',
    description: 'Sustainable Timing System'
}

const MainLayout = ({children}) => {
    return ( 
        <html>
            <body>
                <Navbar></Navbar>
                <main>{children}</main>
            </body>
        </html>
    )
};

export default MainLayout