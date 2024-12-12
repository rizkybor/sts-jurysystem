import '@/assets/styles/global.css'

export const metadata = {
    title: 'Sustainable-JS',
    keywords: 'timing-system, rafting, jury-penalty',
    description: 'Sustainable Timing System'
}

const MainLayout = ({children}) => {
    return ( 
        <html>
            <body>
                <main>{children}</main>
            </body>
        </html>
    )
};

export default MainLayout