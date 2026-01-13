import React, { createContext, useState, useContext } from 'react';
import * as api from '../api/endpoints';

const JobContext = createContext();

export const useJobs = () => useContext(JobContext);

export const JobProvider = ({ children }) => {
    const [availableJobs, setAvailableJobs] = useState([]);
    const [myJobs, setMyJobs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const fetchAvailableJobs = async () => {
        setLoading(true);
        try {
            const res = await api.getDriverJobPool();
            setAvailableJobs(res.data);
        } catch (err) {
            console.error("fetchAvailableJobs Error:", err);
            setError(err);
        } finally {
            setLoading(false);
        }
    };

    const fetchMyJobs = async () => {
        setLoading(true);
        try {
            const res = await api.getDriverMyJobs();
            setMyJobs(res.data);
        } catch (err) {
            console.error("fetchMyJobs Error:", err);
            setError(err);
        } finally {
            setLoading(false);
        }
    };

    const acceptJob = async (jobId) => {
        setLoading(true);
        try {
            await api.acceptDriverJob(jobId);
            // Listeleri güncelle
            await fetchAvailableJobs();
            await fetchMyJobs();
            return true;
        } catch (err) {
            console.error("acceptJob Error:", err);
            setError(err);
            return false;
        } finally {
            setLoading(false);
        }
    };

    const startJourney = async (jobId) => {
        setLoading(true);
        try {
            await api.driverOnWay(jobId);
            await fetchMyJobs();
            return true;
        } catch (err) {
            console.error("startJourney Error:", err);
            setError(err);
            return false;
        } finally {
            setLoading(false);
        }
    };

    const startJob = async (jobId) => {
        setLoading(true);
        try {
            await api.driverStartJob(jobId);
            await fetchMyJobs();
            return true;
        } catch (err) {
            console.error("startJob Error:", err);
            setError(err);
            return false;
        } finally {
            setLoading(false);
        }
    };

    const completeJob = async (jobId) => {
        setLoading(true);
        try {
            await api.completeDriverJob(jobId);
            // Listeleri güncelle
            await fetchAvailableJobs();
            await fetchMyJobs();
            return true;
        } catch (err) {
            console.error("completeJob Error:", err);
            setError(err);
            return false;
        } finally {
            setLoading(false);
        }
    };

    // Helper for Detail Screen to find job in state
    const getJobById = (id) => {
        const job = myJobs.find(j => j.id === id) || availableJobs.find(j => j.id === id);
        return job;
    };

    return (
        <JobContext.Provider value={{ 
            availableJobs,
            myJobs,
            fetchAvailableJobs, 
            fetchMyJobs,
            acceptJob,
            startJourney,
            startJob, 
            completeJob,
            getJobById,
            loading,
            error
        }}>
            {children}
        </JobContext.Provider>
    );
};
