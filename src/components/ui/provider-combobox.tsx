import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { EDUCATION_PROVIDERS } from "@/lib/data";

interface ProviderComboboxProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function ProviderCombobox({ value, onChange, placeholder = "Select provider..." }: ProviderComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [inputValue, setInputValue] = React.useState("");

  // Filter providers based on input
  const filteredProviders = EDUCATION_PROVIDERS.filter((provider) =>
    provider.toLowerCase().includes(inputValue.toLowerCase())
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
        >
          {value || placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command>
          <CommandInput 
            placeholder="Search provider..." 
            value={inputValue}
            onValueChange={setInputValue}
          />
          <CommandList>
            <CommandEmpty>
              <div className="py-2 px-4 text-sm">
                <p className="text-muted-foreground mb-2">No provider found.</p>
                <Button
                  variant="secondary"
                  size="sm"
                  className="w-full"
                  onClick={() => {
                    onChange(inputValue);
                    setOpen(false);
                  }}
                >
                  Use "{inputValue}"
                </Button>
              </div>
            </CommandEmpty>
            <CommandGroup>
              {filteredProviders.map((provider) => (
                <CommandItem
                  key={provider}
                  value={provider}
                  onSelect={(currentValue) => {
                    onChange(currentValue);
                    setOpen(false);
                    setInputValue("");
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === provider ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {provider}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
