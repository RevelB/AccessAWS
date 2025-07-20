
'use client';

import Link from 'next/link';
import { Card, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import type { Job } from '@/lib/types';
import { JobStatus } from '@/lib/types';
import { ALL_JOB_STATUSES_ORDERED, HIGH_PRIORITY_ICON, ON_HOLD_ICON, STELLAR_TASK_ICON } from '@/lib/constants';
import { format, parseISO, startOfDay, isBefore, isEqual, addDays, subDays, isSaturday, isSunday } from 'date-fns';
import { cn } from '@/lib/utils';
import { ChevronRight, ChevronLeft, StickyNote, Loader2 } from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { client } from '@/lib/amplify';

interface JobCardProps {
  job: Job;
}

export function JobCard({ job }: JobCardProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isUpdatingDate, setIsUpdatingDate] = useState(false);


  const [clientSideIsOverdue, setClientSideIsOverdue] = useState<boolean | null>(null);
  const [clientFormattedDeliveryDate, setClientFormattedDeliveryDate] = useState<string | null>(null);
  const [dateStyleType, setDateStyleType] = useState<'past' | 'today' | 'future' | 'invalid' | null>(null);

  useEffect(() => {
    if (job.deliveryDate) {
        try {
            const deliveryDateObj = parseISO(job.deliveryDate);
            const todayStart = startOfDay(new Date());
            const deliveryDateStart = startOfDay(deliveryDateObj);

            const isOverdueValue = isBefore(deliveryDateStart, todayStart) && job.status !== JobStatus.Finished;
            setClientSideIsOverdue(isOverdueValue);

            if (isEqual(deliveryDateStart, todayStart)) {
                setDateStyleType('today');
            } else if (isBefore(deliveryDateStart, todayStart)) {
                setDateStyleType('past');
            } else {
                setDateStyleType('future');
            }
            setClientFormattedDeliveryDate(format(deliveryDateObj, 'dd/MM/yy'));
        } catch (e) {
            console.error("Error parsing or formatting delivery date:", job.deliveryDate, e);
            setClientFormattedDeliveryDate('Invalid Date');
            setDateStyleType('invalid');
            setClientSideIsOverdue(false);
        }
    } else {
        setClientFormattedDeliveryDate('No Date');
        setDateStyleType('invalid');
        setClientSideIsOverdue(false);
    }
  }, [job.deliveryDate, job.status]);


  const currentStatusIndex = ALL_JOB_STATUSES_ORDERED.indexOf(job.status);
  const isFirstStatus = currentStatusIndex <= 0;
  const isLastStatus = currentStatusIndex >= ALL_JOB_STATUSES_ORDERED.length - 1;

  const handleDateChange = async (direction: 'increment' | 'decrement', event: React.MouseEvent) => {
    event.stopPropagation();
    event.preventDefault();
    if (isUpdatingDate || !job.deliveryDate) return;

    setIsUpdatingDate(true);

    try {
      let currentDate = parseISO(job.deliveryDate);
      let newDate: Date;

      if (direction === 'increment') {
        newDate = addDays(currentDate, 1);
        while (isSaturday(newDate) || isSunday(newDate)) {
          newDate = addDays(newDate, 1);
        }
      } else { // decrement
        newDate = subDays(currentDate, 1);
        while (isSaturday(newDate) || isSunday(newDate)) {
          newDate = subDays(newDate, 1);
        }
      }

      await client.models.Job.update({
        id: job.id,
        deliveryDate: newDate.toISOString(),
      });
      // The local state will update automatically via the real-time listener.
    } catch (error) {
      console.error("Failed to update delivery date:", error);
      toast({
        title: "Error",
        description: "Could not update the delivery date.",
        variant: "destructive",
      });
    } finally {
      setIsUpdatingDate(false);
    }
  };


  const handleMoveStatus = async (direction: 'prev' | 'next', event: React.MouseEvent) => {
    event.stopPropagation();
    event.preventDefault();

    if (isLoading) return;
    

    let newStatusIndex = currentStatusIndex;
    if (direction === 'prev' && !isFirstStatus) {
      newStatusIndex = currentStatusIndex - 1;
    } else if (direction === 'next' && !isLastStatus) {
      newStatusIndex = currentStatusIndex + 1;
    } else {
      setIsLoading(false);
      return;
    }

    const newStatus = ALL_JOB_STATUSES_ORDERED[newStatusIndex];

    if (job.status === JobStatus.Delivered && newStatus === JobStatus.Finished) {
      if (!job.inSAP || !job.commercialDescription || job.commercialDescription.trim() === '') {
        toast({
          title: "Action Required",
          description: "Please Ensure Commercial Description field has been filled out and In SAP has been clicked.",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }
    }
    
    setIsLoading(true);

    try {
      await client.models.Job.update({
        id: job.id,
        status: newStatus
      });
      // The success toast is commented out by default, which is fine.
      // toast({ title: "Status Updated", description: `Job "${job.clockNumberMediaName}" moved to ${newStatus}.` });
    } catch (error) {
      console.error("Failed to move job status:", error);
      toast({ title: "Error", description: "An unexpected error occurred while updating status.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const hasProductionNotes = job.productionNotes && job.productionNotes.trim() !== '';
  const showInitials = job.creator || job.checker;
  const isDateInvalid = dateStyleType === 'invalid';

  return (
    <Link href={`/jobs/${job.id}`} className="block group">
      <Card className={cn(
        "hover:shadow-lg transition-shadow duration-200 ease-in-out",
        job.onHold && "opacity-70 border-dashed border-orange-400",
        clientSideIsOverdue === true && dateStyleType === 'past' && "border-destructive bg-destructive/5",
        dateStyleType === 'future' && "bg-muted",
        (isLoading || isUpdatingDate) && "opacity-60 animate-pulse"
      )}>
        <CardHeader className="py-1 px-1">
          <div className="flex flex-col">
            <div className="flex justify-between items-center relative z-5">

              {/* Left group: chevron + icons */}
              <div className="flex items-center gap-1">
                {isFirstStatus ? (
                  <div></div>
                ) : (
                  <button
                    onClick={(e) => handleMoveStatus('prev', e)}
                    disabled={isLoading || isUpdatingDate}
                    className="p-0 rounded-md hover:bg-muted/50 disabled:opacity-30 disabled:cursor-not-allowed w-4 h-4 flex items-center justify-center"
                    aria-label="Move to previous status"
                  >
                    <ChevronLeft className="h-4 w-4 text-muted-foreground" />
                  </button>
                )}

                <div className="flex items-left gap-1.5">
                  {hasProductionNotes && <StickyNote className="h-3 w-3 flex-shrink-0 text-blue-500" />}
                  {job.priority && <HIGH_PRIORITY_ICON className="h-4 w-4 flex-shrink-0 text-orange-500" />}
                  {job.onHold && <ON_HOLD_ICON className="h-4 w-4 flex-shrink-0 text-orange-600" />}
                  {job.stellarTask && <STELLAR_TASK_ICON className="h-4 w-4 flex-shrink-0 text-yellow-500" />}
                </div>
              </div>

              {/* Middle DATE with +/- buttons */}
              <div className="absolute left-1/2 transform -translate-x-1/2 flex items-center gap-1.5">
                {isUpdatingDate ? (
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                ) : clientFormattedDeliveryDate === null ? (
                  <span className="font-medium text-xs text-muted-foreground">Loading...</span>
                ) : (
                  <span
                    className={cn(
                      "font-medium text-xs",
                      (dateStyleType === 'today' || dateStyleType === 'future') && "px-1 rounded-sm",
                      dateStyleType === null && "text-muted-foreground",
                      dateStyleType === 'invalid' && "text-muted-foreground",
                      dateStyleType === 'past' && "text-foreground",
                      dateStyleType === 'today' && "text-foreground bg-card",
                      dateStyleType === 'future' && "text-foreground bg-muted"
                    )}
                  >
                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => handleDateChange('decrement', e)}
                        disabled={isUpdatingDate || isDateInvalid}
                        className={cn(
                          "p-0.5 rounded-md hover:bg-muted/50 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center w-0 h-5 text-xs",
                          isDateInvalid && "invisible"
                        )}
                        aria-label="Decrement delivery date"
                      >
                        -
                      </button>
                      <span>{clientFormattedDeliveryDate}</span>
                      <button
                        onClick={(e) => handleDateChange('increment', e)}
                        disabled={isUpdatingDate || isDateInvalid}
                        className={cn(
                          "p-0.5 rounded-md hover:bg-muted/50 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center w-0 h-5 text-xs",
                          isDateInvalid && "invisible"
                        )}
                        aria-label="Increment delivery date"
                      >
                        +
                      </button>
                    </div>
                  </span>
                )}
              </div>

              {/* Right group: initials + chevron */}
              <div className="flex items-center gap-1">
                <div className="flex items-center gap-1.5 font-small text-xs">
                  {showInitials && !isDateInvalid && (
                        <span className="text-muted-foreground ml-1">
                          ({job.creator || ''}/{job.checker || ''})
                        </span>
                  )}
                </div>
                <button
                  onClick={(e) => handleMoveStatus('next', e)}
                  disabled={isLastStatus || isLoading || isUpdatingDate}
                  className={cn(
                    "p-0 rounded-md hover:bg-muted/50",
                    "disabled:opacity-30 disabled:cursor-not-allowed",
                    isLastStatus && "invisible"
                  )}
                  aria-label="Move to next status"
                >
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </button>
              </div>

            </div>

            {/* clockNumber on the second line */}            
            <div className="flex items-center justify-between text-left">
              <CardTitle className="pl-1 text-xs font-semibold group-hover:text-primary transition-colors">
                {job.clockNumberMediaName}
              </CardTitle>
            </div>

          </div>
        </CardHeader>
      </Card>
    </Link>
  );
}
