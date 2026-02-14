import React, { useState, useEffect } from 'react';
import './Dashboard.css';
import { fetchFactoryMetrics, fetchWorkersMetrics, fetchWorkstationsMetrics, addEvents, seedDatabase } from '../services/api';

const Dashboard = () => {
  const [factoryMetrics, setFactoryMetrics] = useState(null);
  const [workersMetrics, setWorkersMetrics] = useState([]);
  const [workstationsMetrics, setWorkstationsMetrics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedWorker, setSelectedWorker] = useState(null);
  const [selectedWorkstation, setSelectedWorkstation] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  // useGlobalLoading controls whether we show the full-page loading state
  const loadMetrics = async (options = { useGlobalLoading: true }) => {
    const { useGlobalLoading } = options;
    try {
      if (useGlobalLoading) {
        setLoading(true);
      }
      const [factory, workers, workstations] = await Promise.all([
        fetchFactoryMetrics(),
        fetchWorkersMetrics(),
        fetchWorkstationsMetrics()
      ]);
      setFactoryMetrics(factory);
      setWorkersMetrics(workers);
      setWorkstationsMetrics(workstations);
    } catch (error) {
      console.error('Error loading metrics:', error);
    } finally {
      if (useGlobalLoading) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    // Initial load with full-page loading
    loadMetrics({ useGlobalLoading: true });
    // Auto-refresh every 30 seconds (silent refresh, no full-page loading)
    const interval = setInterval(() => loadMetrics({ useGlobalLoading: false }), 30000);
    return () => clearInterval(interval);
  }, []);

  const handleAddEvents = async () => {
    try {
      setRefreshing(true);
      const result = await addEvents(2);
      // Refresh metrics without triggering full-page loading
      await loadMetrics({ useGlobalLoading: false });
      alert(`Added 2 hours of new events! (${result.events_added || 0} events added)`);
    } catch (error) {
      console.error('Error adding events:', error);
      const errorMessage = error.message || 'Unknown error';
      // Check if error indicates database needs seeding
      if (errorMessage.toLowerCase().includes('seed') || errorMessage.toLowerCase().includes('initial') || errorMessage.toLowerCase().includes('please seed')) {
        try {
          // Automatically seed the database
          console.log('Database not seeded, seeding automatically...');
          const seedResult = await seedDatabase();
          // After seeding, try adding events again
          const addResult = await addEvents(2);
          await loadMetrics({ useGlobalLoading: false });
          alert(`Database initialized and added 2 hours of events! (${seedResult.events || 0} initial events + ${addResult.events_added || 0} new events)`);
        } catch (seedError) {
          console.error('Error seeding database:', seedError);
          alert(`Failed to initialize database: ${seedError.message || 'Unknown error'}`);
        }
      } else {
        alert(`Failed to add events: ${errorMessage}`);
      }
    } finally {
      setRefreshing(false);
    }
  };

  if (loading) {
    return <div className="dashboard-loading">Loading metrics...</div>;
  }

  const filteredWorkers = selectedWorker
    ? workersMetrics.filter(w => w.worker_id === selectedWorker)
    : workersMetrics;

  const filteredWorkstations = selectedWorkstation
    ? workstationsMetrics.filter(s => s.station_id === selectedWorkstation)
    : workstationsMetrics;

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <h1>Factory Productivity Monitor</h1>
        <div className="dashboard-actions">
          <button onClick={loadMetrics} disabled={loading}>
            Refresh Metrics
          </button>
          <button onClick={handleAddEvents} disabled={refreshing || loading}>
            {refreshing ? 'Adding Events...' : 'Add 2 Hours of Events'}
          </button>
        </div>
      </header>

      {/* Factory Level Summary */}
      <section className="factory-summary">
        <h2>Factory Overview</h2>
        {factoryMetrics ? (
          <div className="metrics-grid">
            <div className="metric-card">
              <h3>Total Productive Time</h3>
              <p className="metric-value">{factoryMetrics.total_productive_time.toFixed(2)} min</p>
            </div>
            <div className="metric-card">
              <h3>Total Production</h3>
              <p className="metric-value">{factoryMetrics.total_production_count} units</p>
            </div>
            <div className="metric-card">
              <h3>Average Production Rate</h3>
              <p className="metric-value">{factoryMetrics.average_production_rate.toFixed(2)} units/hr</p>
            </div>
            <div className="metric-card">
              <h3>Average Utilization</h3>
              <p className="metric-value">{factoryMetrics.average_utilization.toFixed(2)}%</p>
            </div>
          </div>
        ) : (
          <div className="no-data-message">
            <p>No data available. Click "Add 2 Hours of Events" to initialize and generate data.</p>
          </div>
        )}
      </section>

      {/* Workers Section */}
      <section className="workers-section">
        <div className="section-header">
          <h2>Workers</h2>
          <select
            value={selectedWorker || ''}
            onChange={(e) => setSelectedWorker(e.target.value || null)}
            className="filter-select"
          >
            <option value="">All Workers</option>
            {workersMetrics.map(worker => (
              <option key={worker.worker_id} value={worker.worker_id}>
                {worker.name} ({worker.worker_id})
              </option>
            ))}
          </select>
        </div>
        <div className="workers-grid">
          {filteredWorkers.map(worker => (
            <div key={worker.worker_id} className="worker-card">
              <h3>{worker.name}</h3>
              <p className="worker-id">{worker.worker_id}</p>
              <div className="worker-metrics">
                <div className="metric-row">
                  <span>Active Time:</span>
                  <span>{worker.total_active_time.toFixed(2)} min</span>
                </div>
                <div className="metric-row">
                  <span>Idle Time:</span>
                  <span>{worker.total_idle_time.toFixed(2)} min</span>
                </div>
                <div className="metric-row">
                  <span>Utilization:</span>
                  <span className={worker.utilization_percentage >= 80 ? 'good' : worker.utilization_percentage >= 60 ? 'medium' : 'poor'}>
                    {worker.utilization_percentage.toFixed(2)}%
                  </span>
                </div>
                <div className="metric-row">
                  <span>Units Produced:</span>
                  <span>{worker.total_units_produced}</span>
                </div>
                <div className="metric-row">
                  <span>Units/Hour:</span>
                  <span>{worker.units_per_hour.toFixed(2)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Workstations Section */}
      <section className="workstations-section">
        <div className="section-header">
          <h2>Workstations</h2>
          <select
            value={selectedWorkstation || ''}
            onChange={(e) => setSelectedWorkstation(e.target.value || null)}
            className="filter-select"
          >
            <option value="">All Workstations</option>
            {workstationsMetrics.map(station => (
              <option key={station.station_id} value={station.station_id}>
                {station.name} ({station.station_id})
              </option>
            ))}
          </select>
        </div>
        <div className="workstations-grid">
          {filteredWorkstations.map(station => (
            <div key={station.station_id} className="workstation-card">
              <h3>{station.name}</h3>
              <p className="station-id">{station.station_id}</p>
              <div className="station-metrics">
                <div className="metric-row">
                  <span>Occupancy Time:</span>
                  <span>{station.occupancy_time.toFixed(2)} min</span>
                </div>
                <div className="metric-row">
                  <span>Utilization:</span>
                  <span className={station.utilization_percentage >= 80 ? 'good' : station.utilization_percentage >= 60 ? 'medium' : 'poor'}>
                    {station.utilization_percentage.toFixed(2)}%
                  </span>
                </div>
                <div className="metric-row">
                  <span>Units Produced:</span>
                  <span>{station.total_units_produced}</span>
                </div>
                <div className="metric-row">
                  <span>Throughput Rate:</span>
                  <span>{station.throughput_rate.toFixed(2)} units/hr</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default Dashboard;


