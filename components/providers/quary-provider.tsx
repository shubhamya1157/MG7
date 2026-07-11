"use client"

import {QueryClient,QueryClientProvider} from "@tanstack/react-query";
import {useState} from "react";


export function QuaryProvider({children}:{children:React.ReactNode}){

    const [queryClient,_] = useState(()=>new QueryClient())

    return(
        <QueryClientProvider client = {queryClient}>
            {children}
        </QueryClientProvider>
    )
}