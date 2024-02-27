/**
 * Thread Pool implementation that can have many workers that 
 * can perform functions in parallel
*/

#pragma once
#include "defines.h"

#include <thread>
#include <mutex>
#include <condition_variable>
#include <optional>
#include <vector>
#include <queue>
#include <functional>

namespace thread_pool {

class ThreadPool {
public:
    // Constructors and Destructor
    ThreadPool();
    ~ThreadPool();
    ThreadPool(ThreadPool&& tp);         // only allow to move the thread pool
    ThreadPool(ThreadPool& tp) = delete; // Prevent from copying the thread pool

    static ThreadPool create();              // Create a ne thread pool
    ThreadPool num_workers(u32 num_workers); // Set the number of worker threads

    void begin();                                   // initialization of pool
    void end();                                     // shutdown behavior
    void add_job(const std::function<void()>& job); // push a job onto the job queue to be executed
    bool is_busy();                                 // returns if there are still active threads or not


private:
    void _thread_loop(); // each thread executes this loop waiting for jobs, when one comes in they execute

    bool m_terminate;
    u32 m_num_threads;                         // number of threads to spawn
    std::mutex* m_lock;                        // mutex lock
    std::vector<std::thread> m_threads;        // worker threads
    std::condition_variable* m_lock_condition; // the condition variable to wake a thread
    std::queue<std::function<void()> > m_jobs; // the queue of jobs to be executed
};

}
