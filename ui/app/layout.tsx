import './globals.css'
import { Providers } from './providers'
import { Navbar } from './Navbar'

export const metadata = {
  title: 'Message Monitoring',
  description: 'XML мониторинг на съобщения',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <Navbar />   {/* <- Тук */}
          {children}
        </Providers>
      </body>
    </html>
  )
}
