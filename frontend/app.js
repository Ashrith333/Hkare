document.addEventListener('DOMContentLoaded', () => {
  const centersList = document.getElementById('centers-list');
  const portal = document.getElementById('portal');
  const uploadForm = document.getElementById('upload-form');
  const submissionsList = document.getElementById('submissions-list');
  const downloadArea = document.getElementById('download-area'); // New area for download links

  const diagnosticCenters = ['Center 1', 'Center 2', 'Center 3'];

  let selectedCenter = ''; // Track the currently selected center

  // Display diagnostic centers
  diagnosticCenters.forEach(center => {
    const listItem = document.createElement('li');
    listItem.textContent = center;

    // Handle center selection
    listItem.onclick = async () => {
      selectedCenter = center; // Set the selected center
      portal.style.display = 'block';
      document.getElementById('selected-center').textContent = `Selected Center: ${selectedCenter}`;
      
      // Load submissions immediately after selecting a center
      submissionsList.innerHTML = '<li>Loading submissions...</li>'; // Show a loading message
      await loadSubmissions(); // Load submissions for the selected center
    };

    centersList.appendChild(listItem);
  });

  // Handle file upload
  uploadForm.onsubmit = async (event) => {
    event.preventDefault();

    // Ensure a center is selected
    if (!selectedCenter) {
      alert('Please select a diagnostic center before uploading.');
      return;
    }

    const formData = new FormData(uploadForm);
    formData.append('center_id', selectedCenter); // Append center_id to the form data

    try {
      const response = await fetch('http://localhost:3000/upload', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (response.ok) {
        alert('Report uploaded successfully!');

        // Clear previous download link
        downloadArea.innerHTML = '';

        // Add download link for the simplified report
        const downloadLink = document.createElement('a');
        downloadLink.href = `http://localhost:3000/${result.simplified_report_url}`;
        downloadLink.textContent = 'Download Simplified Report';
        downloadLink.download = 'Simplified_Report.txt';
        downloadArea.appendChild(downloadLink);

        await loadSubmissions(); // Reload submissions
      } else {
        alert(`Error: ${result.message}`);
      }
    } catch (error) {
      console.error('Network error:', error);
      alert('Network error occurred. Please try again.');
    }
  };

  // Load submissions for the selected center
  async function loadSubmissions() {
    if (!selectedCenter) {
      alert('Please select a diagnostic center to view submissions.');
      return;
    }

    try {
      const response = await fetch(`http://localhost:3000/submissions?center_id=${encodeURIComponent(selectedCenter)}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch submissions: ${response.statusText}`);
      }

      const submissions = await response.json();

      submissionsList.innerHTML = ''; // Clear the list before adding new submissions

      if (submissions.length === 0) {
        const noDataMessage = document.createElement('li');
        noDataMessage.textContent = 'No submissions found for this center.';
        submissionsList.appendChild(noDataMessage);
        return;
      }

      submissions.forEach(submission => {
        const listItem = document.createElement('li');

        // Display submission details including the simplified report and download link
        listItem.innerHTML = `
          <strong>Patient:</strong> ${submission.patient_name} <br />
          <strong>Phone:</strong> ${submission.phone_number} <br />
          <strong>Email:</strong> ${submission.email || 'N/A'} <br />
          <strong>Original Report:</strong> <a href="http://localhost:3000/${submission.original_report_url}" target="_blank">Download</a> <br />
          <strong>Simplified Report:</strong> 
          ${
            submission.simplified_report_url 
              ? `<a href="http://localhost:3000/${submission.simplified_report_url}" target="_blank">Download Simplified Report</a>` 
              : '<pre>Pending...</pre>'
          }
        `;

        submissionsList.appendChild(listItem);
      });
    } catch (error) {
      console.error('Error loading submissions:', error);
      submissionsList.innerHTML = '<li>Error loading submissions. Please try again later.</li>';
    }
  }
});
