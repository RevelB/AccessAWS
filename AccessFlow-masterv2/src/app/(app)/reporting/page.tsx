
'use client';

import { getFirestore, collection, query, orderBy, getDocs } from 'firebase/firestore';
import { app } from '@/lib/firebase';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Job, ServiceDetail } from '@/lib/types';
import { format, parseISO, isValid, isBefore, isAfter, startOfDay } from 'date-fns';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, useMemo, useCallback } from 'react';
import { ArrowUp, ArrowDown, ChevronsUpDown, Loader2, Search as SearchIcon, CalendarIcon, XIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { JobSortBy } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';


const SORTABLE_COLUMNS: { key: JobSortBy | 'services'; label: string; minWidth?: string, sortable: boolean, truncated?: boolean, maxWidth?: string, align?: 'right' | 'left' | 'center' }[] = [
  { key: 'deliveryDate', label: 'Delivery Date', minWidth: '0.03125px', sortable: true },
  { key: 'client', label: 'Client', minWidth: '0.0234375px', sortable: true },
  { key: 'commercialDescription', label: 'Commercial Desc.', minWidth: '0.0546875px', sortable: true, truncated: true, maxWidth: '0.0546875px' },
  { key: 'clockNumberMediaName', label: 'Clock Nr/Media Name', minWidth: '0.0390625px', sortable: true },
  { key: 'destination', label: 'Distributor', minWidth: '0.0234375px', sortable: true },
  { key: 'agency', label: 'Agency', minWidth: '0.0234375px', sortable: true },
  { key: 'services', label: 'Services', minWidth: '0.046875px', sortable: false, truncated: true, maxWidth: '0.046875px' },
  { key: 'rate', label: 'Rate (£)', minWidth: '0.0234375px', sortable: true, align: 'center' },
  { key: 'orderNumber', label: 'Order No.', minWidth: '0.03125px', sortable: true, align: 'center' },
  { key: 'poReference', label: 'PO No.', minWidth: '0.0234375px', sortable: true, align: 'center' },
  { key: 'extcosts', label: 'Ext. Costs (£)', minWidth: '0.0234375px', sortable: true, align: 'center' },
  { key: 'creator', label: 'Creator', minWidth: '0.0234375px', sortable: true, align: 'center' },
  { key: 'checker', label: 'Checker', minWidth: '0.0234375px', sortable: true, align: 'center' },
];

export default function ReportingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchInput, setSearchInput] = useState(searchParams.get('searchQuery') || '');

  const [deliveryStartDate, setDeliveryStartDate] = useState<Date | null>(null);
  const [deliveryEndDate, setDeliveryEndDate] = useState<Date | null>(null);

  const sortBy = useMemo(() => searchParams.get('sortBy') as JobSortBy | null, [searchParams]);
  const sortDirection = useMemo(() => searchParams.get('sortDirection') as 'asc' | 'desc' | null, [searchParams]);
  const searchQuery = useMemo(() => searchParams.get('searchQuery') || '', [searchParams]);
  const deliveryStartDateParam = useMemo(() => searchParams.get('deliveryStartDate'), [searchParams]);
  const deliveryEndDateParam = useMemo(() => searchParams.get('deliveryEndDate'), [searchParams]);
  const db = getFirestore(app);

  useEffect(() => {
    if (deliveryStartDateParam) {
      const parsed = parseISO(deliveryStartDateParam);
      if (isValid(parsed)) setDeliveryStartDate(parsed);
      else setDeliveryStartDate(null); // Clear if param is invalid
    } else {
      setDeliveryStartDate(null);
    }
    if (deliveryEndDateParam) {
      const parsed = parseISO(deliveryEndDateParam);
      if (isValid(parsed)) setDeliveryEndDate(parsed);
      else setDeliveryEndDate(null); // Clear if param is invalid
    } else {
      setDeliveryEndDate(null);
    }
  }, [deliveryStartDateParam, deliveryEndDateParam]);

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      
      const sortField = sortBy || 'updatedAt';
      const effectiveSortDirection = sortDirection || (sortField === 'updatedAt' || sortField === 'createdAt' ? 'desc' : 'asc');
      
      let q = query(collection(db, 'jobs'), orderBy(sortField, effectiveSortDirection));

      const querySnapshot = await getDocs(q);
      let jobsList: Job[] = [];
      querySnapshot.forEach((doc) => {
        jobsList.push({ id: doc.id, ...(doc.data() as Omit<Job, 'id'>) });
      });

      // Apply client-side search query filter
      if (searchQuery && searchQuery.trim() !== '') {
        const lowerCaseSearchQuery = searchQuery.toLowerCase().trim();
        jobsList = jobsList.filter(job => {
          const servicesString = (job.services || []).map(s => `${s.name} ${s.subService} ${s.notes}`).join(' ').toLowerCase();
          if (servicesString.includes(lowerCaseSearchQuery)) {
            return true;
          }

          for (const key in job) {
            if (key === 'services') continue;
            const value = job[key as keyof Job];
            if (value !== null && value !== undefined) {
              const stringValue = String(value).toLowerCase();
              if (stringValue.includes(lowerCaseSearchQuery)) {
                return true;
              }
            }
          }
          return false;
        });
      }

      // Apply client-side delivery date range filter
      if (deliveryStartDateParam || deliveryEndDateParam) {
        jobsList = jobsList.filter(job => {
          if (!job.deliveryDate) return false;
          try {
            const jobDeliveryDate = parseISO(job.deliveryDate);
            const jobDeliveryDayStart = startOfDay(jobDeliveryDate);

            if (deliveryStartDateParam) {
              const startDate = startOfDay(parseISO(deliveryStartDateParam));
              if (isBefore(jobDeliveryDayStart, startDate)) {
                return false;
              }
            }
            if (deliveryEndDateParam) {
              const endDate = startOfDay(parseISO(deliveryEndDateParam));
              if (isAfter(jobDeliveryDayStart, endDate)) {
                return false;
              }
            }
            return true;
          } catch (e) {
            console.error("Error parsing date for filtering:", job.deliveryDate, e);
            return false;
          }
        });
      }
      
      setJobs(jobsList);
      setIsLoading(false);
    }
    fetchData();
  }, [sortBy, sortDirection, searchQuery, deliveryStartDateParam, deliveryEndDateParam, db]);

  const handleSort = useCallback((columnKey: JobSortBy) => {
    const newParams = new URLSearchParams(searchParams.toString());
    
    if (sortBy === columnKey) {
      if (sortDirection === 'asc') {
        // From asc -> desc
        newParams.set('sortDirection', 'desc');
      } else {
        // From desc -> default (remove sorting)
        newParams.delete('sortBy');
        newParams.delete('sortDirection');
      }
    } else {
      // From no sort/other column -> asc
      newParams.set('sortBy', columnKey);
      newParams.set('sortDirection', 'asc');
    }
    
    router.push(`/reporting?${newParams.toString()}`, { scroll: false });
  }, [router, searchParams, sortBy, sortDirection]);

  const handleSearch = useCallback(() => {
    const newParams = new URLSearchParams(searchParams.toString());
    if (searchInput.trim()) {
      newParams.set('searchQuery', searchInput.trim());
    } else {
      newParams.delete('searchQuery');
    }
    newParams.delete('page'); // Assuming pagination might exist
    router.push(`/reporting?${newParams.toString()}`, { scroll: false });
  }, [router, searchParams, searchInput]);

  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchInput(e.target.value);
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleDateChange = useCallback((date: Date | undefined, type: 'start' | 'end') => {
    const newParams = new URLSearchParams(searchParams.toString());
    const paramName = type === 'start' ? 'deliveryStartDate' : 'deliveryEndDate';
    
    if (date) {
      if (type === 'start') setDeliveryStartDate(date);
      if (type === 'end') setDeliveryEndDate(date);
      newParams.set(paramName, format(date, 'yyyy-MM-dd'));
    } else {
      if (type === 'start') setDeliveryStartDate(null);
      if (type === 'end') setDeliveryEndDate(null);
      newParams.delete(paramName);
    }
    router.push(`/reporting?${newParams.toString()}`, { scroll: false });
  }, [router, searchParams]);

  const handleClearDateFilters = useCallback(() => {
    setDeliveryStartDate(null);
    setDeliveryEndDate(null);
    const newParams = new URLSearchParams(searchParams.toString());
    newParams.delete('deliveryStartDate');
    newParams.delete('deliveryEndDate');
    router.push(`/reporting?${newParams.toString()}`, { scroll: false });
  }, [router, searchParams]);


  const renderSortIcon = (columnKey: JobSortBy) => {
    if (sortBy === columnKey) {
      return sortDirection === 'asc' ? <ArrowUp className="ml-1 h-3 w-3" /> : <ArrowDown className="ml-1 h-3 w-3" />;
    }
    return <ChevronsUpDown className="ml-1 h-3 w-3 opacity-30" />;
  };

  const formatDateForDisplay = (dateString: string | undefined, forCsv = false) => {
    if (!dateString) return 'N/A';
    try {
      const parsedDate = parseISO(dateString);
      if (!isValid(parsedDate)) return 'Invalid Date';
      return format(parsedDate, forCsv ? 'yyyy-MM-dd HH:mm:ss' : 'dd/MM/yy');
    } catch (e) {
      console.error("Error formatting date:", dateString, e);
      return 'Invalid Date';
    }
  };
  
  const formatServicesForDisplay = (services: ServiceDetail[] | undefined) => {
    if (!services || services.length === 0) return 'N/A';
    return services.map(s => s.customName || s.name).join(', ');
  };

  const formatServicesForTooltip = (services: ServiceDetail[] | undefined) => {
    if (!services || services.length === 0) return 'N/A';
    return services.map(s => {
      let detail = s.customName || s.name;
      if (s.subService) {
          detail += ` (${s.customSubService || s.subService})`;
      }
      if (s.notes) {
          detail += `: ${s.notes}`;
      }
      return detail;
    }).join('; ');
  };


  const formatBoolean = (value: boolean | undefined | null) => {
    if (value === undefined || value === null) return 'N/A';
    return value ? 'Yes' : 'No';
  };

  const escapeCsvField = (field: any): string => {
    if (field === null || field === undefined) {
      return '';
    }
    let stringField = String(field);
    if (stringField.includes('"') || stringField.includes(',') || stringField.includes('\n') || stringField.includes('\r')) {
      stringField = `"${stringField.replace(/"/g, '""')}"`;
    }
    return stringField;
  };

  const handleExportCSV = useCallback(() => {
    if (jobs.length === 0) {
      alert('No data to export.');
      return;
    }

    const headers = SORTABLE_COLUMNS.map(col => escapeCsvField(col.label)).join(',');

    const rows = jobs.map(job => {
      return SORTABLE_COLUMNS.map(col => {
        let value: any;
        if (col.key === 'services') {
          value = formatServicesForTooltip(job.services); // Use detailed format for CSV
        } else {
          value = job[col.key as keyof Job];
        }

        if (['deliveryDate', 'createdAt', 'updatedAt'].includes(col.key)) {
          return escapeCsvField(formatDateForDisplay(value as string | undefined, true));
        }
        if (['onHold', 'inSAP', 'priority'].includes(col.key)) {
          return escapeCsvField(formatBoolean(value as boolean | undefined | null));
        }
        return escapeCsvField(value);
      }).join(',');
    }).join('\n');

    const csvContent = `${headers}\n${rows}`;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `job_report_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  }, [jobs, formatDateForDisplay]);


  return (
    <div className="w-full">
      <div className="flex flex-col gap-2 mb-4">
        <div className="flex flex-wrap items-end gap-x-4 gap-y-2">
          <div className="flex flex-wrap items-end gap-2">
            <Input
              id="searchInput"
              name="searchInput"
              type="search"
              placeholder="Search all fields..."
              value={searchInput}
              onChange={handleSearchInputChange}
              onKeyDown={handleSearchKeyDown}
              className="h-6 px-2 md:w-[200px] lg:w-[250px] text-xs"
              autoComplete="off"
            />
            <Button onClick={handleSearch} size="sm" variant="default" className="h-6 px-2 text-xs">
              <SearchIcon className="h-3 w-3 mr-1" />
              Search
            </Button>
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="startDate" className="text-xs">Delivery Start Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  id="startDate"
                  variant="outline"
                  className={cn(
                    "w-[180px] justify-start text-left font-normal h-6 px-2 text-xs",
                    !deliveryStartDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-3 w-3" />
                  {deliveryStartDate ? format(deliveryStartDate, "MMM dd, yyyy") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={deliveryStartDate ?? undefined}
                  onSelect={(date) => handleDateChange(date, 'start')}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="endDate" className="text-xs">Delivery End Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  id="endDate"
                  variant="outline"
                  className={cn(
                    "w-[180px] justify-start text-left font-normal h-6 px-2 text-xs",
                    !deliveryEndDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-3 w-3" />
                  {deliveryEndDate ? format(deliveryEndDate, "MMM dd, yyyy") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={deliveryEndDate ?? undefined}
                  onSelect={(date) => handleDateChange(date, 'end')}
                  disabled={(date) =>
                    deliveryStartDate ? isBefore(date, deliveryStartDate) : false
                  }
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
          {(deliveryStartDate || deliveryEndDate) && (
            <Button onClick={handleClearDateFilters} size="sm" variant="ghost" className="h-6 px-1">
              <XIcon className="h-3 w-3 mr-1" /> Clear Dates
            </Button>
          )}
        <Button onClick={handleExportCSV} size="sm" variant="default" disabled={isLoading || jobs.length === 0} className="h-6 px-2 text-xs">
          Export
        </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="w-full py-8 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2">Loading report data...</span>
        </div>
      ) : jobs.length === 0 ? (
        <p className="text-muted-foreground">
          {searchQuery || deliveryStartDateParam || deliveryEndDateParam ? `No jobs found matching the criteria.` : 'No jobs found to report.'}
        </p>
      ) : (
        <TooltipProvider>
        <ScrollArea className="w-full rounded-md border bg-card shadow whitespace-nowrap">
          <Table>
            <TableHeader>
              <TableRow>
                {SORTABLE_COLUMNS.map(col => (
                  <TableHead
                    key={col.key}
                    className={cn(
                      "cursor-pointer hover:bg-muted/50 py-1 h-8 text-xs",
                      col.minWidth && `min-w-[${col.minWidth}]`,
                      !col.sortable && "cursor-default hover:bg-transparent",
                      col.align === 'right' && 'text-right',
                      col.align === 'center' && 'text-center'
                    )}
                    onClick={() => col.sortable && handleSort(col.key as JobSortBy)}
                  >
                    <div className={cn(
                        "flex items-center", 
                        col.align === 'right' && 'justify-end',
                        col.align === 'center' && 'justify-center'
                    )}>
                      {col.label}
                      {col.sortable && renderSortIcon(col.key as JobSortBy)}
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {jobs.map((job: Job) => (
                <TableRow key={job.id}>
                  {SORTABLE_COLUMNS.map(col => (
                    <TableCell 
                      key={`${job.id}-${col.key}`} 
                      className={cn(
                        "font-medium py-1 text-xs",
                        col.align === 'right' && 'text-right',
                        col.align === 'center' && 'text-center'
                      )}
                    >
                      {(() => {
                        if (col.key === 'services') {
                            const services = job[col.key];
                            const displayString = formatServicesForDisplay(services);
                            const tooltipString = formatServicesForTooltip(services);
                             return (
                               <Tooltip>
                                 <TooltipTrigger asChild>
                                    <div className={cn("truncate", col.maxWidth && `max-w-[${col.maxWidth}]`)}>
                                      {displayString}
                                    </div>
                                 </TooltipTrigger>
                                 <TooltipContent>
                                   <p>{tooltipString}</p>
                                 </TooltipContent>
                               </Tooltip>
                             );
                        }
                        
                        const value = job[col.key as keyof Job];
                        if (col.key === 'deliveryDate') {
                          return formatDateForDisplay(value as string | undefined);
                        }
                        if (col.key === 'inSAP') {
                          return formatBoolean(value as boolean | undefined | null);
                        }
                        if (col.truncated) {
                          const text = value as string | null | undefined;
                          return (
                            <div
                              className={cn("truncate", col.maxWidth && `max-w-[${col.maxWidth}]`)}
                              title={text || undefined}
                            >
                              {text || 'N/A'}
                            </div>
                          );
                        }
                        return String(value === null || value === undefined ? 'N/A' : value);
                      })()}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
        </TooltipProvider>
      )}
    </div>
  );
}
