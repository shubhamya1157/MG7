import { GitDiffIcon} from "@phosphor-icons/react/dist/ssr";


export function Footer() {
  return (

    //first greate a container name footer then we give top borde border-t
    //then 
    <footer className="border-t border-border/90">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-8 sm:flex-row">
        <div className="flex items-center gap-2 ">
          <span className="grid size-7 place-items-center rounded-lg bg-primary/15 text-primary">
            <GitDiffIcon className="size-7" weight="bold" />
          </span>
          <span className="font-heading font-semibold">MG7</span>
        </div>

        <p className="text-sm text-muted-foreground">
          Built by Shubham Yadav 
        </p>


        <p className="text-md  ">
        Every PR matters!
        </p>

        
      </div>
    </footer>
  );
}
