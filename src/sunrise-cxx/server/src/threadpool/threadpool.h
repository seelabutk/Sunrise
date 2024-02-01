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
    void end();
    void add_job(const std::function<void()>& job);
    bool is_busy();


private:
    void _thread_loop();

    bool m_terminate;
    u32 m_num_threads; // number of threads to spawn
    std::mutex* m_lock;
    std::condition_variable* m_lock_condition;
    std::vector<std::thread> m_threads;
    std::queue<std::function<void()> > m_jobs;
};

}