'use client';

import { useState, useEffect, useCallback } from 'react';

export interface DailyWeather {
    date: string;
    temperature: {
        min: number;
        max: number;
    };
    condition: string;
    icon: string;
    precipitation: number;
}

interface MonthWeatherState {
    data: Record<string, DailyWeather>; // Date string (YYYY-MM-DD) -> Weather Data
    loading: boolean;
    error: string | null;
}

export function useMonthWeather(year: number, month: number) {
    const [state, setState] = useState<MonthWeatherState>({
        data: {},
        loading: true,
        error: null
    });

    const fetchMonthWeather = useCallback(async () => {
        try {
            setState(prev => ({ ...prev, loading: true, error: null }));

            const params = new URLSearchParams({
                type: 'monthly',
                year: year.toString(),
                month: month.toString(),
                // Default coordinates (Niigata) - In a real app, these should come from project context
                lat: '37.4',
                lon: '138.9'
            });

            const res = await fetch(`/api/weather?${params.toString()}`);
            if (!res.ok) throw new Error('Failed to fetch weather');

            const json = await res.json();

            const dataMap: Record<string, DailyWeather> = {};
            if (json.monthly && Array.isArray(json.monthly)) {
                json.monthly.forEach((day: any) => {
                    dataMap[day.date] = day;
                });
            }

            setState({
                data: dataMap,
                loading: false,
                error: null
            });
        } catch (error) {
            console.error('Failed to fetch monthly weather:', error);
            setState(prev => ({ ...prev, loading: false, error: 'Weather fetch failed' }));
        }
    }, [year, month]);

    useEffect(() => {
        fetchMonthWeather();
    }, [fetchMonthWeather]);

    return state;
}
