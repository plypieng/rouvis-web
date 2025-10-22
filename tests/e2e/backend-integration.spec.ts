import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:3001'; // Backend URL

test.describe('Backend API Integrations', () => {
  test('should connect to backend health endpoint', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/v1/health`);
    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data.status).toBe('ok');
  });

  test('should create and retrieve activities via API', async ({ request }) => {
    const testUserId = `test-user-${Date.now()}`;

    // Create activity
    const createResponse = await request.post(`${BASE_URL}/v1/activities`, {
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': testUserId,
        'idempotency-key': `test-activity-${Date.now()}`,
      },
      data: {
        type: 'watering',
        qty: 15,
        unit: 'L',
        note: 'API test activity',
      },
    });

    expect(createResponse.status()).toBe(201);
    const createdActivity = await createResponse.json();
    expect(createdActivity.id).toBeDefined();
    expect(createdActivity.type).toBe('watering');
    expect(createdActivity.quantity).toBe(15);

    // Retrieve activities
    const listResponse = await request.get(`${BASE_URL}/v1/activities?limit=10`, {
      headers: {
        'x-user-id': testUserId,
      },
    });

    expect(listResponse.status()).toBe(200);
    const activitiesData = await listResponse.json();
    expect(Array.isArray(activitiesData.activities)).toBe(true);

    // Check our created activity is in the list
    const ourActivity = activitiesData.activities.find((a: any) => a.id === createdActivity.id);
    expect(ourActivity).toBeDefined();
  });

  test('should handle activity idempotency', async ({ request }) => {
    const testUserId = `test-user-${Date.now()}`;
    const idempotencyKey = `idempotency-test-${Date.now()}`;

    // Create first activity
    const response1 = await request.post(`${BASE_URL}/v1/activities`, {
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': testUserId,
        'idempotency-key': idempotencyKey,
      },
      data: {
        type: 'fertilizing',
        qty: 5,
        unit: 'kg',
      },
    });

    expect(response1.status()).toBe(201);
    const activity1 = await response1.json();

    // Try to create same activity with same key
    const response2 = await request.post(`${BASE_URL}/v1/activities`, {
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': testUserId,
        'idempotency-key': idempotencyKey,
      },
      data: {
        type: 'fertilizing',
        qty: 5,
        unit: 'kg',
      },
    });

    expect(response2.status()).toBe(200); // Should return cached result
    const activity2 = await response2.json();
    expect(activity2.id).toBe(activity1.id); // Same activity returned
  });

  test('should delete activities via API', async ({ request }) => {
    const testUserId = `test-user-${Date.now()}`;

    // Create activity first
    const createResponse = await request.post(`${BASE_URL}/v1/activities`, {
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': testUserId,
        'idempotency-key': `delete-test-${Date.now()}`,
      },
      data: {
        type: 'watering',
        qty: 10,
        unit: 'L',
      },
    });

    const createdActivity = await createResponse.json();
    const activityId = createdActivity.id;

    // Delete activity
    const deleteResponse = await request.delete(`${BASE_URL}/v1/activities/${activityId}`, {
      headers: {
        'x-user-id': testUserId,
      },
    });

    expect(deleteResponse.status()).toBe(200);
    const deleteData = await deleteResponse.json();
    expect(deleteData.success).toBe(true);
  });

  test('should create and retrieve fields via API', async ({ request }) => {
    const testUserId = `test-user-${Date.now()}`;

    // Create field
    const createResponse = await request.post(`${BASE_URL}/v1/fields`, {
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': testUserId,
      },
      data: {
        name: 'API Test Field',
        crop: 'rice',
        geojson: {
          type: 'Polygon',
          coordinates: [[[139.7, 36.5], [139.8, 36.5], [139.8, 36.4], [139.7, 36.4], [139.7, 36.5]]],
        },
      },
    });

    expect(createResponse.status()).toBe(201);
    const createdField = await createResponse.json();
    expect(createdField.id).toBeDefined();
    expect(createdField.name).toBe('API Test Field');
    expect(createdField.crop).toBe('rice');

    // Retrieve fields
    const listResponse = await request.get(`${BASE_URL}/v1/fields`, {
      headers: {
        'x-user-id': testUserId,
      },
    });

    expect(listResponse.status()).toBe(200);
    const fieldsData = await listResponse.json();
    expect(Array.isArray(fieldsData.fields)).toBe(true);

    // Check our created field is in the list
    const ourField = fieldsData.fields.find((f: any) => f.id === createdField.id);
    expect(ourField).toBeDefined();
  });

  test('should create tasks via API', async ({ request }) => {
    const testUserId = `test-user-${Date.now()}`;

    // Create task
    const createResponse = await request.post(`${BASE_URL}/v1/tasks`, {
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': testUserId,
      },
      data: {
        title: 'API Test Task',
        dueAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        notes: 'Created via API test',
      },
    });

    expect(createResponse.status()).toBe(201);
    const createdTask = await createResponse.json();
    expect(createdTask.id).toBeDefined();
    expect(createdTask.title).toBe('API Test Task');
  });

  test('should handle agent streaming via API', async ({ request }) => {
    const testUserId = `test-user-${Date.now()}`;

    // Start agent conversation
    const response = await request.post(`${BASE_URL}/v1/agents/run`, {
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': testUserId,
      },
      data: {
        threadId: `api-test-${Date.now()}`,
        messages: [{ role: 'user', content: 'Hello from API test' }],
        userId: testUserId,
      },
    });

    expect(response.status()).toBe(200);

    // Check response is SSE stream
    const contentType = response.headers()['content-type'];
    expect(contentType).toContain('text/event-stream');

    // Read stream data
    const responseBody = await response.text();
    const lines = responseBody.split('\n\n').filter(line => line.length > 0);

    expect(lines.length).toBeGreaterThan(0);

    // Check for valid SSE events
    for (const line of lines) {
      if (line === '[DONE]') continue;
      const dataLine = line.replace('data: ', '');
      const event = JSON.parse(dataLine);
      expect(event).toHaveProperty('type');
      expect(['message', 'tool_call', 'tool_result', 'error', 'final']).toContain(event.type);
    }
  });

  test('should handle search API', async ({ request }) => {
    const searchResponse = await request.get(`${BASE_URL}/v1/search?q=rice%20farming`);

    expect(searchResponse.status()).toBe(200);
    const searchData = await searchResponse.json();
    expect(searchData).toHaveProperty('results');
    // Results structure may vary based on implementation
  });

  test('should handle chat history API', async ({ request }) => {
    const testUserId = `test-user-${Date.now()}`;

    const historyResponse = await request.get(`${BASE_URL}/chat/history?userId=${testUserId}`);

    expect(historyResponse.status()).toBe(200);
    const historyData = await historyResponse.json();
    expect(Array.isArray(historyData)).toBe(true);
  });

  test('should handle weather API', async ({ request }) => {
    const weatherResponse = await request.get(`${BASE_URL}/api/weather?lat=36.5&lon=138.2`);

    expect(weatherResponse.status()).toBe(200);
    const weatherData = await weatherResponse.json();
    expect(weatherData).toHaveProperty('current');
    expect(weatherData).toHaveProperty('forecast');
  });

  test('should handle API error responses correctly', async ({ request }) => {
    // Test invalid activity creation
    const invalidResponse = await request.post(`${BASE_URL}/v1/activities`, {
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': 'test-user',
      },
      data: {
        type: 'invalid_type',
        qty: -5, // Invalid quantity
        unit: 'invalid_unit',
      },
    });

    expect(invalidResponse.status()).toBe(400);
    const errorData = await invalidResponse.json();
    expect(errorData).toHaveProperty('error');
  });

  test('should handle authentication headers', async ({ request }) => {
    // Test without user ID header
    const noUserResponse = await request.post(`${BASE_URL}/v1/activities`, {
      headers: {
        'Content-Type': 'application/json',
      },
      data: {
        type: 'watering',
        qty: 10,
        unit: 'L',
      },
    });

    // Should either require auth or handle gracefully
    expect([400, 401, 403]).toContain(noUserResponse.status());
  });

  test('should handle rate limiting', async ({ request }) => {
    const testUserId = `test-user-${Date.now()}`;

    // Make multiple rapid requests
    const promises = [];
    for (let i = 0; i < 10; i++) {
      promises.push(
        request.post(`${BASE_URL}/v1/activities`, {
          headers: {
            'Content-Type': 'application/json',
            'x-user-id': testUserId,
            'idempotency-key': `rate-limit-test-${i}-${Date.now()}`,
          },
          data: {
            type: 'watering',
            qty: 1,
            unit: 'L',
            note: `Rate limit test ${i}`,
          },
        })
      );
    }

    const responses = await Promise.all(promises);

    // Some requests might be rate limited
    const rateLimited = responses.some(r => r.status() === 429);
    if (rateLimited) {
      // If rate limiting is implemented, check proper error response
      const rateLimitResponse = responses.find(r => r.status() === 429);
      const errorData = await rateLimitResponse!.json();
      expect(errorData).toHaveProperty('error');
      expect(errorData.error).toContain('rate limit');
    }
  });

  test('should handle CORS headers', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/v1/health`);

    // Check CORS headers
    const corsHeaders = response.headers();
    expect(corsHeaders).toHaveProperty('access-control-allow-origin');
    expect(corsHeaders).toHaveProperty('access-control-allow-methods');
    expect(corsHeaders).toHaveProperty('access-control-allow-headers');
  });

  test('should handle API versioning', async ({ request }) => {
    // Test v1 endpoints
    const v1Response = await request.get(`${BASE_URL}/v1/health`);
    expect(v1Response.status()).toBe(200);

    const v1Data = await v1Response.json();
    expect(v1Data).toHaveProperty('version', '1');
  });
});