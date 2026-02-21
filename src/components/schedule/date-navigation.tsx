'use client'

import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react'

interface DateNavigationProps {
  selectedDate: Date
  onDateChange: (date: Date) => void
}

export function DateNavigation({ selectedDate, onDateChange }: DateNavigationProps) {
  function navigateDay(offset: number) {
    const newDate = new Date(selectedDate)
    newDate.setDate(newDate.getDate() + offset)
    if (newDate >= new Date(new Date().toDateString())) {
      onDateChange(newDate)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="icon-sm" onClick={() => navigateDay(-1)}>
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="min-w-[160px] font-mono text-sm font-medium">
            <CalendarDays className="mr-2 h-4 w-4" />
            {selectedDate.toLocaleDateString('en-US', {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
            })}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="center">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={(date) => {
              if (date) onDateChange(date)
            }}
            disabled={(date) => date < new Date(new Date().toDateString())}
          />
        </PopoverContent>
      </Popover>
      <Button variant="outline" size="icon-sm" onClick={() => navigateDay(1)}>
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  )
}
