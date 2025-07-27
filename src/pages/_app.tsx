/* eslint-disable @next/next/no-css-tags */
import '@/styles/globals.css';
import type { AppProps } from 'next/app';
import Head from 'next/head';
import { Toaster } from 'react-hot-toast';


export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>
        <title>Ad Campaign Dashboard</title>
        <meta name="description" content="Real-time Ad Campaign Dashboard" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
        <link href="[https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap](https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap)" rel="stylesheet" />
      </Head>
       <Toaster position="top-right" />
      <Component {...pageProps} />
    </>
  );
}