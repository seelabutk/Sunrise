#include "threadpool.h"
#include "defines.h"

namespace thread_pool {

/// @brief Constructor
ThreadPool::ThreadPool() {

}

/// @brief Destructor
ThreadPool::~ThreadPool() {

}

/// @brief Copy constructor -- move the items that are not copyable
/// @param tp The thread pool being copied
ThreadPool::ThreadPool(ThreadPool&& tp) {
    m_terminate = tp.m_terminate;
    m_num_threads = tp.m_num_threads;
    m_lock = std::move(tp.m_lock);
    m_lock_condition = std::move(tp.m_lock_condition);
    m_threads = std::move(tp.m_threads);
    m_jobs = std::move(tp.m_jobs);
}

/// @brief Create a new threadpool with default values
/// @return the created threadpool
ThreadPool ThreadPool::create() {
    ThreadPool pool {};
    pool.m_num_threads = std::thread::hardware_concurrency() / 2;
    pool.m_terminate = false;
    pool.m_lock = new std::mutex();
    pool.m_lock_condition = new std::condition_variable();

    return pool;
}

/// @brief Create the desired amount of threads and put store them
///        Each thread is given the ThreadPool::_thread_loop which is their logic
void ThreadPool::begin() {
    for (u32 i = 0; i < m_num_threads; i++) {
        std::thread th(&ThreadPool::_thread_loop, this);
        m_threads.emplace_back(std::move(th));
    }
}

/// @brief Terminate the threads
void ThreadPool::end() {
    {
        std::unique_lock<std::mutex> lock(*m_lock);
        m_terminate = true;
    }
    m_lock_condition->notify_all();
    for (std::thread& active_thread : m_threads) {
        active_thread.join();
    }
    m_threads.clear();
}

/// @brief Set the number of worker threads we want
/// @param num_workers the desired number of threads
/// @return the moved thread pool
ThreadPool ThreadPool::num_workers(u32 num_workers) {
    m_num_threads = num_workers;
    return std::move(*this);
}

/// @brief each thread waits until it is awoken by a job on the queue
///        and will then perform the desired task
void ThreadPool::_thread_loop() {
    while (1) {
        std::function<void()> job;
        {
            std::unique_lock<std::mutex> lock(*m_lock);
            m_lock_condition->wait(lock, [this] {
                return !m_jobs.empty() || m_terminate;
            });
            if (m_terminate) {
                return;
            }
            job = m_jobs.front();
            m_jobs.pop();
        }

        job();
    }
}

/// @brief Add a job to the queue 
/// @param job the job to be pushed
void ThreadPool::add_job(const std::function<void()>& job) {
    {
        std::unique_lock<std::mutex> lock(*m_lock);
        m_jobs.push(job);
    }
    m_lock_condition->notify_one();

    return;
}

/// @brief if you want to wait on all threads to terminate, you can use this
/// @return  whether the pool still has active threads
bool ThreadPool::is_busy() {
    bool busy;
    {
        std::unique_lock<std::mutex> lock(*m_lock);
        busy = !m_jobs.empty();
    }
    return busy;
}

}
