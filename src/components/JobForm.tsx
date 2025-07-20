
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { format, isBefore, startOfDay, parseISO, isValid as isDateValid } from 'date-fns';
import { client } from '@/lib/amplify';
import { getUserPrefs, saveJobFormServiceHeight } from '@/lib/userPrefs';
import { softDeleteJob } from '@/lib/deletedJobs';
import { useAuth } from '@/context/AuthContext';

import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from '@/hooks/use-toast';
import type { Job, JobCreateInput, JobUpdateInput, ServiceDetail } from '@/lib/types';
import { JobStatus } from '@/lib/types';
import {
  SERVICE_OPTIONS,
  SUB_SERVICE_CATEGORY_OPTIONS,
  DESTINATION_OPTIONS,
  RAW_DESTINATION_OPTIONS,
} from '@/lib/constants';
import { CalendarIcon, Loader2, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';

// Schema for a single service line in the form
const serviceDetailFormSchema = z.object({
  selected: z.boolean(),
  customName: z.string().max(30, 'Custom service name must be 30 characters or less.').optional(),
  subService: z.string().optional(),
  notes: z.string().max(50, 'Service notes must be 50 characters or less.').optional(),
});

// Dynamically create a schema for all possible services
const servicesSchema = z.object(
  SERVICE_OPTIONS.reduce((acc, option) => {
    acc[option] = serviceDetailFormSchema;
    return acc;
  }, {} as Record<string, typeof serviceDetailFormSchema>)
);

const jobFormSchemaBase = z.object({
  clockNumberMediaName: z.string().min(1, 'Clock Number / Media Name is required.'),
  orderNumber: z.string().optional(),
  client: z.string().optional(),
  agency: z.string().optional(),
  deliveryDate: z.date({ required_error: 'Delivery Date is required.' }),
  poReference: z.string().optional(),
  destination: z.string().optional(),
  customDestination: z.string().max(50, 'Custom destination must be 50 characters or less.').optional(),
  productionNotes: z.string().optional(),
  creator: z.string().regex(/^[A-Z0-9]{2,3}$|^$/, 'Creator must be 2 or 3 uppercase alphanumeric initials.').optional(),
  checker: z.string().regex(/^[A-Z0-9]{2,3}$|^$/, 'Checker must be 2 or 3 uppercase alphanumeric initials.').optional(),
  commercialDescription: z.string().optional(),
  status: z.nativeEnum(JobStatus).optional(),
  priority: z.boolean(),
  onHold: z.boolean(),
  inSAP: z.boolean(),
  stellarTask: z.boolean(),
  rate: z.number().optional(),
  services: servicesSchema,
});

const jobFormSchema = jobFormSchemaBase.superRefine((data, ctx) => {
  if (data.destination === 'Other...' && (!data.customDestination || data.customDestination.trim() === '')) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Please specify your custom destination.',
      path: ['customDestination'],
    });
  }
  
  let hasSelectedService = false;
  for (const serviceName of SERVICE_OPTIONS) {
    const serviceData = data.services[serviceName];
    if (serviceData.selected) {
      hasSelectedService = true;

      if (serviceName === 'Other' && (!serviceData.customName || serviceData.customName.trim() === '')) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Please specify custom service name.',
          path: [`services.${serviceName}.customName`],
        });
      }
    }
  }

  if (!hasSelectedService) {
     ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'At least one service must be selected.',
      path: ['services'],
    });
  }
});


type JobFormValues = z.infer<typeof jobFormSchema>;

interface JobFormProps {
  mode: 'create' | 'edit';
  initialData?: Job | Partial<JobCreateInput> | null;
  viewOnly?: boolean;
}

// Helper to initialize the nested services object for the form
const getInitialServicesState = (): JobFormValues['services'] => {
  return SERVICE_OPTIONS.reduce((acc, option) => {
    acc[option] = {
      selected: false,
      customName: '',
      subService: '',
      notes: ''
    };
    return acc;
  }, {} as JobFormValues['services']);
};


const getComprehensiveDefaultValues = (
  jobData?: Job | Partial<JobCreateInput> | null,
  currentMode?: 'create' | 'edit'
): JobFormValues => {
  const modeToUse = currentMode || (jobData && 'id' in jobData && jobData.id ? 'edit' : 'create');

  const defaultValues: JobFormValues = {
      clockNumberMediaName: '',
      orderNumber: '',
      client: '',
      agency: '',
      deliveryDate: new Date(),
      poReference: '',
      destination: '',
      customDestination: '',
      productionNotes: '',
      creator: '',
      checker: '',
      commercialDescription: '',
      status: JobStatus.Booked,
      priority: false,
      onHold: false,
      inSAP: false,
      stellarTask: false,
      rate: undefined,
      services: getInitialServicesState(),
  };

  if (!jobData) {
    return defaultValues;
  }
  
  // Populate from jobData, but keep our form's `services` object structure intact.
  const { services: jobDataServices, ...restOfJobData } = jobData;
  Object.assign(defaultValues, restOfJobData);
  
  // Handle Date
  if (jobData.deliveryDate) {
    const parsedDate = typeof jobData.deliveryDate === 'string' 
      ? parseISO(jobData.deliveryDate) 
      : jobData.deliveryDate;
    if(isDateValid(parsedDate)) {
      defaultValues.deliveryDate = parsedDate;
    }
  }

  // Handle Destination
  if (jobData.destination) {
    if (RAW_DESTINATION_OPTIONS.includes(jobData.destination)) {
      defaultValues.destination = jobData.destination;
    } else {
      defaultValues.destination = 'Other...';
      defaultValues.customDestination = jobData.destination;
    }
  }

  // Handle Services (New Structure)
  if (jobDataServices && Array.isArray(jobDataServices)) {
    jobDataServices.forEach(service => {
      // Add a safety check in case a service object from the database is malformed.
      if (!service || typeof service.name !== 'string') return;

      if (SERVICE_OPTIONS.includes(service.name)) {
        defaultValues.services[service.name].selected = true;
        defaultValues.services[service.name].subService = service.subService;
        defaultValues.services[service.name].notes = service.notes;
      } else { // Handle services not in our standard list (e.g., old "Other" values)
        defaultValues.services['Other'].selected = true;
        defaultValues.services['Other'].customName = service.name;
        defaultValues.services['Other'].subService = service.subService;
        defaultValues.services['Other'].notes = service.notes;
      }
    });
  }
  
  // Reset fields not intended for duplication
  if (modeToUse === 'create' && jobData) {
      defaultValues.creator = '';
      defaultValues.checker = '';
      defaultValues.commercialDescription = '';
      defaultValues.status = JobStatus.Booked;
      defaultValues.priority = false;
      defaultValues.onHold = false;
      defaultValues.inSAP = false;
      defaultValues.stellarTask = false;
      defaultValues.rate = undefined;
      // When duplicating, also check for customDestination from query params
      if ('customDestination' in jobData && jobData.customDestination) {
        defaultValues.customDestination = jobData.customDestination;
      }
  }

  return defaultValues;
};


export function JobForm({ mode, initialData, viewOnly = false }: JobFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [buttonText, setButtonText] = useState<string>("Loading date...");
  const [showPastDateWarning, setShowPastDateWarning] = useState(false);
  const { user } = useAuth();
  
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const [scrollAreaHeight, setScrollAreaHeight] = useState<number>(150);
  const previousHeightRef = useRef<number>(150);

  const form = useForm<JobFormValues>({
    resolver: zodResolver(jobFormSchema),
    defaultValues: getComprehensiveDefaultValues(initialData, mode),
  });

  useEffect(() => {
    if (user) {
      const fetchUserPrefs = async () => {
        try {
          const userPrefs = await getUserPrefs(user.userId);
          if (userPrefs?.initials && mode === 'create' && !form.getValues('creator')) {
            form.setValue('creator', userPrefs.initials);
          }
          if (userPrefs?.jobFormServiceHeight) {
            setScrollAreaHeight(userPrefs.jobFormServiceHeight);
            previousHeightRef.current = userPrefs.jobFormServiceHeight;
          }
        } catch (error) {
          // User preferences don't exist yet, that's okay
          console.log('No user preferences found');
        }
      };
      fetchUserPrefs();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, user]);


  const handleResizeEnd = useCallback(async () => {
    if (!scrollAreaRef.current || !user) return;
    
    const newHeight = scrollAreaRef.current.offsetHeight;

    if (newHeight !== previousHeightRef.current) {
        setScrollAreaHeight(newHeight); // Update state to reflect new size
        previousHeightRef.current = newHeight; // Update ref to prevent re-saving same size
        // Save the new height to user preferences
        try {
          await saveJobFormServiceHeight(user.userId, newHeight);
        } catch (error) {
          console.error("Failed to save scroll area height:", error);
        }
    }
  }, [user]);

  const watchedServices = useWatch({ control: form.control, name: 'services' });
  const watchedDestination = form.watch('destination');
  const deliveryDateValue = form.watch('deliveryDate');

  const sortedServiceOptions = useMemo(() => {
    if (!watchedServices) {
      return SERVICE_OPTIONS;
    }
    return [...SERVICE_OPTIONS].sort((a, b) => {
      const aIsSelected = watchedServices[a]?.selected ?? false;
      const bIsSelected = watchedServices[b]?.selected ?? false;
      if (aIsSelected === bIsSelected) {
        return 0;
      }
      return aIsSelected ? -1 : 1;
    });
  }, [watchedServices]);

  useEffect(() => {
    if (deliveryDateValue && isDateValid(deliveryDateValue)) {
      setButtonText(format(deliveryDateValue, 'dd MMM yyyy'));
      const today = startOfDay(new Date());
      const selectedDate = startOfDay(deliveryDateValue);
      setShowPastDateWarning(isBefore(selectedDate, today));
    } else {
      setButtonText("Pick a date");
      setShowPastDateWarning(false);
    }
  }, [deliveryDateValue]);

  useEffect(() => {
    form.reset(getComprehensiveDefaultValues(initialData, mode));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialData, mode]);


  const onSubmit = async (data: JobFormValues) => {
    setIsSubmitting(true);
    try {
      // Transform the services object into an array of ServiceDetail
      const selectedServices: ServiceDetail[] = Object.entries(data.services)
        .filter(([, serviceData]) => serviceData.selected)
        .map(([serviceName, serviceData]) => ({
          name: serviceName === 'Other' ? 'Other' : serviceName,
          subService: serviceData.subService || '',
          notes: serviceData.notes || '',
          customName: serviceName === 'Other' ? serviceData.customName : undefined,
        }));


      const finalDestination = data.destination === 'Other...'
        ? data.customDestination || ''
        : data.destination || '';

      if (mode === 'create') {
        const jobPayload = {
            clockNumberMediaName: data.clockNumberMediaName,
            deliveryDate: data.deliveryDate.toISOString(),
            destination: finalDestination,
            status: JobStatus.Booked,
            priority: data.priority,
            onHold: data.onHold,
            inSAP: data.inSAP,
            stellarTask: data.stellarTask,
            services: JSON.stringify(selectedServices),
        } as any;

        if (data.orderNumber) jobPayload.orderNumber = data.orderNumber;
        if (data.client) jobPayload.client = data.client;
        if (data.agency) jobPayload.agency = data.agency;
        if (data.poReference) jobPayload.poReference = data.poReference;
        if (data.productionNotes) jobPayload.productionNotes = data.productionNotes;
        if (data.creator) jobPayload.creator = data.creator;
        if (data.checker) jobPayload.checker = data.checker;
        if (data.commercialDescription) jobPayload.commercialDescription = data.commercialDescription;
        if (data.rate !== undefined) jobPayload.rate = data.rate;

        await client.models.Job.create(jobPayload);
        toast({ title: 'Job Created', description: `Job "${data.clockNumberMediaName}" has been successfully created.` });
        router.push('/dashboard/open');
        router.refresh();

      } else if (initialData && 'id' in initialData && initialData.id) {
        const jobPayload = {
            clockNumberMediaName: data.clockNumberMediaName,
            deliveryDate: data.deliveryDate.toISOString(),
            destination: finalDestination,
            status: data.status || JobStatus.Booked,
            priority: data.priority,
            onHold: data.onHold,
            inSAP: data.inSAP,
            stellarTask: data.stellarTask,
            services: JSON.stringify(selectedServices),
        } as any;
        
        // Add optional fields only if they have a value
        if (data.orderNumber) jobPayload.orderNumber = data.orderNumber;
        if (data.client) jobPayload.client = data.client;
        if (data.agency) jobPayload.agency = data.agency;
        if (data.poReference) jobPayload.poReference = data.poReference;
        if (data.productionNotes) jobPayload.productionNotes = data.productionNotes;
        if (data.creator) jobPayload.creator = data.creator;
        if (data.checker) jobPayload.checker = data.checker;
        if (data.commercialDescription) jobPayload.commercialDescription = data.commercialDescription;
        if (data.rate !== undefined) jobPayload.rate = data.rate;


        await client.models.Job.update({
          id: initialData.id,
          ...jobPayload
        });
        toast({ title: 'Job Updated', description: `Job "${jobPayload.clockNumberMediaName}" has been successfully updated.` });
        router.push('/dashboard/open');
        router.refresh();
      }
    } catch (error) {
      console.error('Failed to submit job form:', error);
      toast({ title: 'Error', description: 'An unexpected error occurred.', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteJob = async () => {
    if (!initialData || !('id' in initialData) || !initialData.id || !user) return;
    setIsDeleting(true);
    try {
      // Use soft delete to preserve job data
      await softDeleteJob(initialData as Job, user.userId);
      
      toast({ title: "Job Deleted", description: `Job "${initialData.clockNumberMediaName}" has been successfully deleted.` });
      setIsDeleteDialogOpen(false);
      router.push('/dashboard/open');
      router.refresh();
    } catch (error) {
      console.error("Failed to delete job:", error);
      toast({ title: 'Error', description: 'An unexpected error occurred while deleting the job.', variant: 'destructive' });
    } finally {
      setIsDeleting(false);
    }
  };
  
  const handleDuplicateJob = () => {
    if (!initialData) return;

    const queryParams = new URLSearchParams();
    if (initialData.clockNumberMediaName) queryParams.append('clockNumberMediaName', initialData.clockNumberMediaName);
    if (initialData.orderNumber) queryParams.append('orderNumber', initialData.orderNumber);
    if (initialData.client) queryParams.append('client', initialData.client);
    if (initialData.agency) queryParams.append('agency', initialData.agency);
    if (initialData.poReference) queryParams.append('poReference', initialData.poReference);
    
    // Services are now complex, so we pass them as a stringified JSON
    if ('services' in initialData && initialData.services && initialData.services.length > 0) {
      queryParams.append('services', JSON.stringify(initialData.services));
    }


    if (initialData.destination) {
      const isRawDestination = RAW_DESTINATION_OPTIONS.includes(initialData.destination);
      if (!isRawDestination) {
        queryParams.append('destination', 'Other...');
        queryParams.append('customDestination', initialData.destination);
      } else {
        queryParams.append('destination', initialData.destination);
      }
    }

    if (initialData.deliveryDate) {
      const dateToConvert = typeof initialData.deliveryDate === 'string'
        ? parseISO(initialData.deliveryDate)
        : initialData.deliveryDate;
      if (dateToConvert instanceof Date && !isNaN(dateToConvert.getTime())) {
         queryParams.append('deliveryDate', dateToConvert.toISOString());
      }
    }
    if (initialData.productionNotes) queryParams.append('productionNotes', initialData.productionNotes);

    router.push(`/jobs/new?${queryParams.toString()}`);
  };

  const titleText = useMemo(() => {
    if (viewOnly) return `View Job: ${initialData?.clockNumberMediaName || ''}`;
    if (mode === 'create') return initialData ? 'Duplicate Job' : 'Create New Job';
    return `Edit Job: ${initialData?.clockNumberMediaName || ''}`;
  }, [mode, initialData, viewOnly]);


  return (
    <Card>
      <CardHeader className="pb-0">
        <CardTitle className="font-headline text-lg">{titleText}</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-2">
            <fieldset disabled={viewOnly}>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-start">
                <FormField
                  control={form.control}
                  name="clockNumberMediaName"
                  render={({ field }) => (
                    <FormItem className="space-y-1 md:col-span-2">
                      <FormLabel className="text-xs">Clock Number / Media Name</FormLabel>
                      <FormControl>
                        <Input {...field} className="h-8 text-xs" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                  control={form.control}
                  name="orderNumber"
                  render={({ field }) => (
                    <FormItem className="space-y-1">
                      <FormLabel className="text-xs">Order Number</FormLabel>
                      <FormControl>
                        <Input {...field} className="h-8 text-xs" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="deliveryDate"
                  render={({ field }) => (
                    <FormItem className="space-y-1">
                        <FormLabel className="text-xs">Delivery Date</FormLabel>
                        {showPastDateWarning && (
                          <span className="text-xs font-medium text-destructive">
                            {' '}(In the Past)
                          </span>
                        )}
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={'outline'}
                              disabled={viewOnly}
                              className={cn(
                                'w-full pl-3 text-left font-normal h-8 text-xs',
                                !field.value && 'text-muted-foreground'
                              )}
                            >
                              {buttonText}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* --- Services Section --- */}
              <div className="border rounded-lg p-3 space-y-2">
                <h3 className="text-xs font-medium">Service Details</h3>
                  <ScrollArea
                    ref={scrollAreaRef}
                    style={{ height: `${scrollAreaHeight}px` }}
                    onMouseUp={handleResizeEnd}
                    className={cn(
                      "w-full rounded-md border p-2 overflow-auto",
                      !viewOnly && "resize-y" // Only allow resize if not viewOnly
                    )}
                  >
                      <div className="space-y-2">
                          {sortedServiceOptions.map((serviceName) => {
                          const isSelected = watchedServices?.[serviceName]?.selected;
                          const isOtherService = serviceName === 'Other';

                          return (
                              <div key={serviceName} className="p-2 rounded-md transition-colors bg-muted/20 hover:bg-muted/50">
                              <div className="grid grid-cols-1 md:grid-cols-4 gap-x-3 gap-y-1 items-start">
                                  {/* Service Toggle */}
                                  <FormField
                                  control={form.control}
                                  name={`services.${serviceName}.selected`}
                                  render={({ field }) => (
                                      <FormItem className="flex flex-row items-center p-1 space-x-3 space-y-0 md:col-span-1">
                                      <FormControl>
                                          <Switch
                                          id={`services.${serviceName}.selected`}
                                          name={`services.${serviceName}.selected`}
                                          checked={field.value}
                                          onCheckedChange={(checked) => {
                                              field.onChange(checked);
                                              if (!checked) {
                                              form.setValue(`services.${serviceName}.subService`, '');
                                              form.setValue(`services.${serviceName}.notes`, '');
                                              if (isOtherService) {
                                                  form.setValue(`services.${serviceName}.customName`, '');
                                              }
                                              }
                                          }}
                                          />
                                      </FormControl>
                                      <FormLabel htmlFor={`services.${serviceName}.selected`} className="font-normal text-xs">{serviceName}</FormLabel>
                                      </FormItem>
                                  )}
                                  />
                                  
                                  {isSelected && (
                                  <div className="grid grid-cols-1 md:grid-cols-3 gap-x-3 gap-y-2 md:col-span-3 items-start">
                                      {/* Custom Service Name Input (for "Other") */}
                                      {isOtherService && (
                                      <FormField
                                          control={form.control}
                                          name={`services.${serviceName}.customName`}
                                          render={({ field }) => (
                                          <FormItem className="space-y-1">
                                              <FormControl>
                                              <Input {...field} id={field.name} name={field.name} maxLength={30} className="h-8 text-xs" placeholder="Custom Service Name" />
                                              </FormControl>
                                              <FormMessage />
                                          </FormItem>
                                          )}
                                      />
                                      )}

                                      {/* Sub-Service Dropdown */}
                                      <FormField
                                      control={form.control}
                                      name={`services.${serviceName}.subService`}
                                      render={({ field }) => (
                                          <FormItem className="space-y-1">
                                          <Select onValueChange={field.onChange} value={field.value || ''} name={field.name}>
                                              <FormControl>
                                              <SelectTrigger id={field.name} className="h-8 text-xs">
                                                  <SelectValue placeholder="Sub-Service" />
                                              </SelectTrigger>
                                              </FormControl>
                                              <SelectContent>
                                              {SUB_SERVICE_CATEGORY_OPTIONS.map(cat => (
                                                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                              ))}
                                              </SelectContent>
                                          </Select>
                                          <FormMessage />
                                          </FormItem>
                                      )}
                                      />

                                      {/* Notes Input */}
                                      <FormField
                                      control={form.control}
                                      name={`services.${serviceName}.notes`}
                                      render={({ field }) => (
                                          <FormItem className="space-y-1 md:col-span-2">
                                          <FormControl>
                                              <Input {...field} id={field.name} name={field.name} maxLength={50} className="h-8 text-xs" placeholder="Service Notes" />
                                          </FormControl>
                                          <FormMessage />
                                          </FormItem>
                                      )}
                                      />
                                  </div>
                                  )}
                              </div>
                              </div>
                          );
                          })}
                      </div>
                                      </ScrollArea>
                </div>


              <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                <FormField
                  control={form.control}
                  name="client"
                  render={({ field }) => (
                    <FormItem className="space-y-1">
                      <FormLabel className="text-xs">Client</FormLabel>
                      <FormControl>
                        <Input {...field} className="h-8 text-xs" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="agency"
                  render={({ field }) => (
                    <FormItem className="space-y-1">
                      <FormLabel className="text-xs">Agency</FormLabel>
                      <FormControl>
                        <Input {...field} className="h-8 text-xs" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="poReference"
                  render={({ field }) => (
                    <FormItem className="space-y-1">
                      <FormLabel className="text-xs">PO Reference</FormLabel>
                      <FormControl>
                        <Input {...field} className="h-8 text-xs" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
               <div>
                  <FormField
                    control={form.control}
                    name="destination"
                    render={({ field }) => (
                      <FormItem className="space-y-1">
                        <FormLabel className="text-xs">Distributor</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || ''} name={field.name}>
                          <FormControl>
                            <SelectTrigger id={field.name} className="h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {DESTINATION_OPTIONS.map(option => (
                              <SelectItem key={option} value={option}>{option}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {watchedDestination === 'Other...' && (
                    <FormField
                      control={form.control}
                      name="customDestination"
                      render={({ field }) => (
                        <FormItem className="mt-2 space-y-1">
                          <FormLabel className="text-xs">Custom Destination</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              maxLength={50}
                              className="h-8 text-xs"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-start">
                  <FormField
                  control={form.control}
                  name="productionNotes"
                  render={({ field }) => (
                      <FormItem className="space-y-1 md:col-span-2">
                      <FormLabel className="text-xs">Production Notes</FormLabel>
                      <FormControl>
                          <Textarea
                          rows={1}
                          {...field}
                          className="text-xs min-h-[20px]"
                          />
                      </FormControl>
                      <FormMessage />
                      </FormItem>
                  )}
                  />
                  <FormField
                  control={form.control}
                  name="creator"
                  render={({ field }) => (
                      <FormItem className="space-y-1">
                      <FormLabel className="text-xs">Creator</FormLabel>
                      <FormControl>
                          <Input
                          {...field}
                          maxLength={3}
                          onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                          className="h-8 text-xs"
                          />
                      </FormControl>
                      <FormMessage />
                      </FormItem>
                  )}
                  />
                  <FormField
                  control={form.control}
                  name="checker"
                  render={({ field }) => (
                      <FormItem className="space-y-1">
                      <FormLabel className="text-xs">Checker</FormLabel>
                      <FormControl>
                          <Input
                          {...field}
                          maxLength={3}
                          onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                          className="h-8 text-xs"
                          />
                      </FormControl>
                      <FormMessage />
                      </FormItem>
                  )}
                  />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-end">
                <FormField
                  control={form.control}
                  name="priority"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-2 space-x-3 space-y-0 md:col-span-1">
                      <FormLabel className="text-xs">High Priority</FormLabel>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          disabled={isSubmitting || isDeleting}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="onHold"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-2 space-x-3 space-y-0 md:col-span-1">
                      <FormLabel className="text-xs">On Hold</FormLabel>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          disabled={isSubmitting || isDeleting}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="stellarTask"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-2 space-x-3 space-y-0 md:col-span-1">
                      <FormLabel className="text-xs">Stellar Task</FormLabel>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          disabled={isSubmitting || isDeleting}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                <FormField
                  control={form.control}
                  name="commercialDescription"
                  render={({ field }) => (
                    <FormItem className="space-y-1 md:col-span-3">
                      <FormLabel className="text-xs">Commercial Description</FormLabel>
                      <FormControl>
                        <Textarea rows={1} {...field} className="text-xs min-h-[16px]" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                  control={form.control}
                  name="inSAP"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-2 space-x-3 space-y-0 md:col-span-1">
                      <FormLabel className="text-xs">In SAP</FormLabel>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          disabled={isSubmitting || isDeleting}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
            </fieldset>

            <div className="flex justify-between items-center pt-4">
              {viewOnly ? (
                  <div></div> // Placeholder to keep the "Close" button on the right
                ) : (
                <div className="flex gap-2">
                  {mode === 'edit' && (
                    <Button
                      type="button"
                      onClick={handleDuplicateJob}
                      disabled={isSubmitting || isDeleting}
                      className="bg-primary hover:bg-primary/90 text-primary-foreground"
                    >
                      Duplicate
                    </Button>
                  )}
                  {mode === 'edit' && initialData && 'id' in initialData && initialData.id && (
                    <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                      <AlertDialogTrigger asChild>
                        <Button type="button" variant="destructive" disabled={isSubmitting || isDeleting}>
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete Job
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the job
                            "{initialData.clockNumberMediaName}" from the database.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={handleDeleteJob}
                            disabled={isDeleting}
                            className="bg-destructive hover:bg-destructive/90"
                          >
                            {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
              )}
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => router.back()} disabled={isSubmitting || isDeleting}>
                  {viewOnly ? "Close" : "Cancel"}
                </Button>
                {!viewOnly && (
                  <Button type="submit" disabled={isSubmitting || isDeleting} className="bg-accent hover:bg-accent/90 text-accent-foreground">
                    {isSubmitting ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : null}
                    {mode === 'create' ? (initialData ? 'Create Duplicate Job' : 'Create Job') : 'Save Changes'}
                  </Button>
                )}
              </div>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
