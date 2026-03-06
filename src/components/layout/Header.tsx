'use client';

import { useFiltersStore } from '@/store/useFiltersStore';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Filter, Menu, Download, Bell } from 'lucide-react';
import { useFilters } from '@/hooks/useFilters';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { SidebarContent } from './Sidebar';
import { motion } from 'framer-motion';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Link from 'next/link';

const VEHICLES = ['All', 'Truck', 'Train', 'Ship', 'Air'];
const FUELS = ['All', 'Diesel', 'Electric', 'Hydrogen', 'Biodiesel', 'Sustainable Aviation Fuel'];
const REGIONS = ['All', 'North America', 'Europe', 'Asia Pacific'];
const BUS_UNITS = ['All', 'B2B Freight', 'D2C Express', 'Heavy Industrial'];

export function Header() {
  useFilters();
  const { vehicleType, fuelType, region, businessUnit, setVehicleType, setFuelType, setRegion, setBusinessUnit } = useFiltersStore();

  return (
    <motion.header
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="sticky top-0 z-40 flex h-16 w-full items-center justify-between border-b bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60 px-4 md:px-6 shadow-sm"
    >
      <div className="flex items-center gap-2">
        {/* Mobile Sidebar Toggle */}
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="lg:hidden shrink-0 mr-2">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[250px] p-0 flex flex-col">
            <SidebarContent />
          </SheetContent>
        </Sheet>

        <Filter className="h-4 w-4 text-primary hidden md:block" />
        <h2 className="text-sm font-semibold text-foreground hidden md:block">Global Context</h2>
      </div>

      <div className="flex items-center space-x-2 md:space-x-4 overflow-x-auto w-full md:w-auto justify-end scrollbar-hide">
        {/* Extended Filters */}
        <div className="hidden xl:flex items-center space-x-2">
          <Select value={region} onValueChange={setRegion}>
            <SelectTrigger className="w-[130px] h-9 text-xs bg-muted/50 border-transparent hover:bg-muted transition-colors">
              <SelectValue placeholder="Region" />
            </SelectTrigger>
            <SelectContent>
              {REGIONS.map((r) => (
                <SelectItem key={r} value={r} className="text-xs">{r}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="hidden lg:flex items-center space-x-2">
          <Select value={businessUnit} onValueChange={setBusinessUnit}>
            <SelectTrigger className="w-[130px] h-9 text-xs bg-muted/50 border-transparent hover:bg-muted transition-colors">
              <SelectValue placeholder="Unit" />
            </SelectTrigger>
            <SelectContent>
              {BUS_UNITS.map((u) => (
                <SelectItem key={u} value={u} className="text-xs">{u}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center space-x-2">
          <Select value={vehicleType} onValueChange={setVehicleType}>
            <SelectTrigger className="w-[110px] md:w-[130px] h-9 text-xs border-muted-foreground/20">
              <SelectValue placeholder="Vehicle" />
            </SelectTrigger>
            <SelectContent>
              {VEHICLES.map((v) => (
                <SelectItem key={v} value={v} className="text-xs">{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center space-x-2">
          <Select value={fuelType} onValueChange={setFuelType}>
            <SelectTrigger className="w-[110px] md:w-[160px] h-9 text-xs border-muted-foreground/20">
              <SelectValue placeholder="Fuel Type" />
            </SelectTrigger>
            <SelectContent>
              {FUELS.map((f) => (
                <SelectItem key={f} value={f} className="text-xs">{f}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="h-6 w-px bg-border mx-2 hidden md:block" />

        {/* Notification Bell */}
        <motion.div
          className="relative hidden md:flex"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
        >
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-4 w-4" />
            <motion.span
              className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-orange-500"
              animate={{ scale: [1, 1.3, 1] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            />
          </Button>
        </motion.div>

        <Button variant="outline" size="sm" className="hidden md:flex bg-primary/5 text-primary border-primary/20 hover:bg-primary/10 transition-all duration-200" asChild>
          <Link href="/reports">
            <Download className="mr-2 h-4 w-4" /> Reports
          </Link>
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-9 w-9 rounded-full ml-2 shrink-0">
              <Avatar className="h-9 w-9 border-2 border-primary/20 transition-all duration-200 hover:border-primary/50">
                <AvatarImage src="/avatars/01.png" alt="@admin" />
                <AvatarFallback className="bg-primary/10 text-primary font-bold">JD</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">Jane Doe</p>
                <p className="text-xs leading-none text-muted-foreground">
                  admin@cioa.app
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              Profile Settings
            </DropdownMenuItem>
            <DropdownMenuItem>
              ESG Notification Preferences
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive font-medium">
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </motion.header>
  );
}
