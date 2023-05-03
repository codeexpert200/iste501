const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql2');
const mysql2 = require('mysql2/promise');
const cors = require('cors');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const path = require('path');
const sgMail = require('@sendgrid/mail');
const multer = require('multer');
const upload = multer();
const dayAbbreviations = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const app = express();
app.use(bodyParser.json());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../web')));
app.use(cors());

async function queryDatabase(query, params) {
  const connection = await mysql2.createConnection({
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
  });

  try {
    const [results] = await connection.execute(query, params);
    return results;
  } catch (error) {
    console.error(error);
    throw error;
  } finally {
    await connection.end();
  }
}

const connection2 = mysql2.createPool({
  host: process.env.MYSQL_HOST,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

const PORT = process.env.PORT;
app.listen(PORT, () => {
  console.log(`Node.js running on port ${PORT}`);
});

app.post('/signin', async (req, res) => {
  const email = req.body.email;
  const password = req.body.password;

  const query1 = 'SELECT user_id, user_type FROM user WHERE user_email = ? AND user_password = SHA2(?, 256)';
  try {
    const results = await queryDatabase(query1, [email, password]);
      if (results.length > 0) {
        const user = results[0];
        const userId = user.user_id;
        const userType = user.user_type;

        if (userType == 'Patient') {
          const query2 = 'SELECT patient_first_name, patient_last_name FROM patient WHERE user_id = ?';
          connection.query(query2, [userId], (error, results) => {
            
            if (error) {
              console.error(error);
              res.status(500).send('Server error');
            } else {
              if (results.length > 0) {
                const patient = results[0];
                res.status(200).json({
                  user_id: userId,
                  patient_first_name: patient.patient_first_name,
                  patient_last_name: patient.patient_last_name,
                  user_type: userType
                });
              } else {
                res.status(401).send('User unauthorized');
              }
            }
          });
        } else {
          if (userType == 'Doctor') {
            const query3 = 'SELECT doctor_first_name, doctor_last_name FROM doctor WHERE user_id = ?';
            connection.query(query3, [userId], (error, results) => {
              
              if (error) {
                console.error(error);
                res.status(500).send('Server error');
              } else {
                if (results.length > 0) {
                  const doctor = results[0];
                  res.status(200).json({
                    user_id: userId,
                    doctor_first_name: doctor.doctor_first_name,
                    doctor_last_name: doctor.doctor_last_name,
                    user_type: userType
                  });
                } else {
                  res.status(401).send('User unauthorized');
                }
              }
            });
          }
          else {
            const query4 = 'SELECT mentor_first_name, mentor_last_name FROM mentor WHERE user_id = ?';
            connection.query(query4, [userId], (error, results) => {
              
              if (error) {
                console.error(error);
                res.status(500).send('Server error');
              } else {
                if (results.length > 0) {
                  const mentor = results[0];
                  res.status(200).json({
                    user_id: userId,
                    mentor_first_name: mentor.mentor_first_name,
                    mentor_last_name: mentor.mentor_last_name,
                    user_type: userType
                  });
                } else {
                  res.status(401).send('User unauthorized');
                }   
              }
            });
          }
        }
      } else {
        res.status(401).send('User unauthorized');
      }
    } catch (error) {
      console.error(error);
      res.status(500).send('Server error');
    }
  });

app.post('/verifyemail', async (req, res) => {
    const userType = req.body.userType;
    const token = crypto.randomBytes(20).toString('hex');
    const expiresIn = 1;
    const now = new Date();
    now.setUTCHours(now.getUTCHours() + 4 + expiresIn);
    const timestamp = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-${String(now.getUTCDate()).padStart(2, '0')} ${String(now.getUTCHours()).padStart(2, '0')}:${String(now.getUTCMinutes()).padStart(2, '0')}:${String(now.getUTCSeconds()).padStart(2, '0')}`;
    const email = req.body.email;
    const password = req.body.password;
    const firstName = req.body.firstName;
    const lastName = req.body.lastName;
    const phoneNumber = req.body.phoneNumber;
    const dateOfBirth = req.body.dateOfBirth;
    const nationality = req.body.nationality;
    const gender = req.body.gender;
    const bloodType = req.body.bloodType;
    const emergencyContactName = req.body.emergencyContactName;
    const emergencyContactPhone = req.body.emergencyContactPhone;
    const query1 = 'INSERT INTO user_verify_email (user_verify_email_user_type, user_verify_email_token, user_verify_email_first_name, user_verify_email_last_name, user_verify_email_phone_number, user_verify_email_date_of_birth, user_verify_email_nationality, user_verify_email_gender, user_verify_email_blood_type, user_verify_email_emergency_contact_name, user_verify_email_emergency_contact_phone, user_verify_email_email, user_verify_email_password, user_verify_email_timestamp_expire) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, SHA2(?, 256), ?)';
    try {
    const results = await queryDatabase(query1, [userType, token, firstName, lastName, phoneNumber, dateOfBirth, nationality, gender, bloodType, emergencyContactName, emergencyContactPhone, email, password, timestamp]);
        const mailOptions = {
          from: 'medivance.no.reply@gmail.com',
          to: email,
          subject: 'Email Verify',
          text: `Hello,    


You are receiving this email because you need to verify your email for your account.

Please click on the link below, or paste it in your browser to verify the email of your account.

https://medivance.onrender.com/verifyemail.html?token=${token}

Please note that the link above is valid for one hour from the time you received this email.

If you did not sign up for an account, then please ignore this email.

This is an automated email. Please do not reply.
          

Regards,

Medivance Support Team`,
        };
    
        sgMail.send(mailOptions)
          .then(() => {
            res.status(200).send('Email sent');
          })
          .catch((error) => {
            console.error('Error sending email:', error);
            res.status(500).send('Error sending email');
          });
        } catch (error) {
          console.error(error);
          res.status(500).send('Server error');
        }
      });

      app.post('/signup', async (req, res) => {
        const token = req.body.token;
        const now = new Date();
        now.setUTCHours(now.getUTCHours() + 4);
        const timestamp = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-${String(now.getUTCDate()).padStart(2, '0')} ${String(now.getUTCHours()).padStart(2, '0')}:${String(now.getUTCMinutes()).padStart(2, '0')}:${String(now.getUTCSeconds()).padStart(2, '0')}`;
        const query1 = 'SELECT * FROM user_verify_email WHERE user_verify_email_token = ? AND user_verify_email_timestamp_expire > ?';
      
        try {
          const results1 = await queryDatabase(query1, [token, timestamp]);
      
          if (results1.length === 0) {
            res.status(400).send('Invalid or expired token');
          } else {
            const row = results1[0];
            const userType = row.user_verify_email_user_type;
            const email = row.user_verify_email_email;
            const password = row.user_verify_email_password;
            const firstName = row.user_verify_email_first_name;
            const lastName = row.user_verify_email_last_name;
            const phoneNumber = row.user_verify_email_phone_number;
            const dateOfBirth = row.user_verify_email_date_of_birth;
            const nationality = row.user_verify_email_nationality;
            const gender = row.user_verify_email_gender;
            const bloodType = row.user_verify_email_blood_type;
            const emergencyContactName = row.user_verify_email_emergency_contact_name;
            const emergencyContactPhone = row.user_verify_email_emergency_contact_phone;
            const query2 = 'INSERT INTO user (user_email, user_password, user_type) VALUES (?, ?, ?)';
            const results2 = await queryDatabase(query2, [email, password, userType]);
      
            if (userType == "Patient") {
              const userId = results2.insertId;
              const query3 = 'INSERT INTO patient (user_id, patient_first_name, patient_last_name, patient_phone_number, patient_date_of_birth, patient_nationality, patient_gender, patient_blood_type, patient_emergency_contact_name, patient_emergency_contact_phone) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
              const results3 = await queryDatabase(query3, [userId, firstName, lastName, phoneNumber, dateOfBirth, nationality, gender, bloodType, emergencyContactName, emergencyContactPhone]);
              const query4 = 'DELETE FROM user_verify_email WHERE user_verify_email_email = ?';
              const results4 = await queryDatabase(query4, [email]);
              res.status(200).send('Patient added');
            } else if (userType == "Doctor") {
              const userId = results2.insertId;
              const query5 = 'INSERT INTO doctor (user_id, doctor_first_name, doctor_last_name, doctor_phone_number, doctor_date_of_birth, doctor_nationality, doctor_gender) VALUES (?, ?, ?, ?, ?, ?, ?)';
              const results5 = await queryDatabase(query5, [userId, firstName, lastName, phoneNumber, dateOfBirth, nationality, gender]);
              const query6 = 'DELETE FROM user_verify_email WHERE user_verify_email_email = ?';
              const results6 = await queryDatabase(query6, [email]);
              res.status(200).send('Doctor added');
            } else {
              const userId = results2.insertId;
              const query7 = 'INSERT INTO mentor (user_id, mentor_first_name, mentor_last_name, mentor_phone_number, mentor_date_of_birth, mentor_nationality, mentor_gender) VALUES (?, ?, ?, ?, ?, ?, ?)';
              const results7 = await queryDatabase(query7, [userId, firstName, lastName, phoneNumber, dateOfBirth, nationality, gender]);
              const query8 = 'DELETE FROM user_verify_email WHERE user_verify_email_email = ?';
              const results8 = await queryDatabase(query8, [email]);
              res.status(200).send('Mentor added');
            }
          }
        } catch (error) {
          console.error(error);
          res.status(500).send('Server error');
        }
      });
            

app.post('/checkemail', async (req, res) => {
  const email = req.body.email;
  const query1 = 'SELECT user_email FROM user WHERE user_email = ?';

  try {
    const results = await queryDatabase(query1, [email]);

    if (results.length > 0) {
      res.status(200).json({ emailMatches: true });
    } else {
      res.status(200).json({ emailMatches: false });
    }
  } catch (error) {
    console.error(error);
    res.status(500).send('Server error');
  }
});
      

app.post('/forgotpassword', async (req, res) => {
  const email = req.body.email;
  // Generate a random token
  const token = crypto.randomBytes(20).toString('hex');
  const expiresIn = 1;
  const now = new Date();
  now.setUTCHours(now.getUTCHours() + 4 + expiresIn);
  const timestamp = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-${String(now.getUTCDate()).padStart(2, '0')} ${String(now.getUTCHours()).padStart(2, '0')}:${String(now.getUTCMinutes()).padStart(2, '0')}:${String(now.getUTCSeconds()).padStart(2, '0')}`;

  // Check if the email exists in the database and update the token and expiration
  const query1 = 'INSERT INTO reset_password (reset_password_token, reset_password_email, reset_password_timestamp_expire) VALUES (?, ?, ?)';
  
  try {
    const results = await queryDatabase(query1, [token, email, timestamp]);

    // Set up the email options
    const mailOptions = {
      from: 'medivance.no.reply@gmail.com',
      to: email,
      subject: 'Password Reset',
      text: `Hello,

You are receiving this email because you requested a password reset for your account.

Please click on the link below, or paste it in your browser to reset the password of your account.

https://medivance.onrender.com/resetpassword.html?token=${token}

Please note that the link above is valid for one hour from the time you received this email.

If you did not request a password reset for your account, then please ignore this email, and the password of your account will remain unchanged.

This is an automated email. Please do not reply.

Regards,

Medivance Support Team`,
    };

    sgMail.send(mailOptions)
      .then(() => {
        res.status(200).send('Email sent');
      })
      .catch((error) => {
        console.error('Error sending email:', error);
        res.status(500).send('Error sending email');
      });

  } catch (error) {
    console.error(error);
    res.status(500).send('Server error');
  }
});


app.post('/resetpassword', async (req, res) => {
  const { token, newPassword } = req.body;
  const now = new Date();
  now.setUTCHours(now.getUTCHours() + 4);
  const timestamp = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-${String(now.getUTCDate()).padStart(2, '0')} ${String(now.getUTCHours()).padStart(2, '0')}:${String(now.getUTCMinutes()).padStart(2, '0')}:${String(now.getUTCSeconds()).padStart(2, '0')}`;

  // Find the user with the provided token and check if it's still valid
  const query1 = `SELECT reset_password_email FROM reset_password WHERE reset_password_token = ? AND reset_password_timestamp_expire > ?`;

  try {
    const result = await queryDatabase(query1, [token, timestamp]);

    if (result.length === 0) {
      res.status(400).send('Invalid or expired token');
      return;
    } else {
      const email = result[0].reset_password_email;
      const query2 = `UPDATE user SET user_password = SHA2(?, 256) WHERE user_email = ?`;

      try {
        const results = await queryDatabase(query2, [newPassword, email]);

        if (result.length === 0) {
          res.status(400).send('Email does not exist');
          return;
        } else {
          const query3 = 'DELETE FROM reset_password WHERE reset_password_email = ?';
          const results3 = await queryDatabase(query3, [email]);

          res.status(200).send('Password reset successful');
        }
      } catch (error) {
        console.error(error);
        res.status(500).send('Server error');
      }
    }
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});


app.post('/uploadmedicalrecord', upload.fields([{ name: 'pdf_data', maxCount: 1 }]), async (req, res) => {
  const userId = parseInt(req.body.user_id);
  const pdfData = req.files.pdf_data[0].buffer;
  const fileName = req.body.file_name;
  const fileSize = parseInt(req.body.file_size, 10);
  const now = new Date();
  now.setUTCHours(now.getUTCHours() + 4);
  const timestamp = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-${String(now.getUTCDate()).padStart(2, '0')} ${String(now.getUTCHours()).padStart(2, '0')}:${String(now.getUTCMinutes()).padStart(2, '0')}:${String(now.getUTCSeconds()).padStart(2, '0')}`;
  const query1 = 'INSERT INTO patient_medical_record (user_id, patient_medical_record_name, patient_medical_record_size, patient_medical_record_file, patient_medical_record_timestamp_create) VALUES (?, ?, ?, ?, ?)';
  
  try {
    const results = await queryDatabase(query1, [userId, fileName, fileSize, pdfData, timestamp]);
    res.status(200).send('File uploaded successfully');
  } catch (error) {
    console.error(error);
    res.status(500).send('Server error');
  }
});

app.delete('/deletemedicalrecord/:id', async (req, res) => {
  const recordId = parseInt(req.params.id, 10);
  const query1 = 'DELETE FROM patient_medical_record WHERE patient_medical_record_id = ?';

  try {
    const results = await queryDatabase(query1, [recordId]);
    if (results.affectedRows === 1) {
      res.status(200).send('File deleted successfully');
    } else {
      res.status(404).send('File not found');
    }
  } catch (error) {
    console.error(error);
    res.status(500).send('Server error');
  }
});

app.get('/getmedicalrecords/:userId', async (req, res) => {
  const userId = parseInt(req.params.userId);
  const query1 = 'SELECT patient_medical_record_id, patient_medical_record_name, patient_medical_record_size, patient_medical_record_timestamp_create FROM patient_medical_record WHERE user_id = ?';

  try {
    const results = await queryDatabase(query1, [userId]);
    res.status(200).json(results);
  } catch (error) {
    console.error(error);
    res.status(500).send('Server error');
  }
});

app.get('/downloadmedicalrecord/:id', async (req, res) => {
  const recordId = parseInt(req.params.id, 10);
  const query1 = 'SELECT patient_medical_record_file FROM patient_medical_record WHERE patient_medical_record_id = ?';

  try {
    const results = await queryDatabase(query1, [recordId]);
    if (results.length === 1) {
      const pdfBuffer = results[0].patient_medical_record_file;
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=medical_record_${recordId}.pdf`);
      res.send(pdfBuffer);
    } else {
      res.status(404).send('File not found');
    }
  } catch (error) {
    console.error(error);
    res.status(500).send('Server error');
  }
});

app.post('/getheartrate', async (req, res) => {
  const userId = req.body.userId;
  const query1 = 'SELECT patient_heart_rate_value, patient_heart_rate_timestamp FROM patient_heart_rate WHERE patient_id = ?';

  try {
    const results = await queryDatabase(query1, [userId]);
    if (results.length > 0) {
      res.status(200).json({
        patient_heart_rate_value: results[0].patient_heart_rate_value,
        patient_heart_rate_timestamp: results[0].patient_heart_rate_timestamp,
      });
    } else {
      res.status(401).send('No heart rate data found');
    }
  } catch (error) {
    console.error(error);
    res.status(500).send('Server error');
  }
});

app.post('/gettemperature', async (req, res) => {
  const userId = req.body.userId;
  const query1 = 'SELECT patient_temperature_value, patient_temperature_timestamp FROM patient_temperature WHERE patient_id = ?';

  try {
    const results = await queryDatabase(query1, [userId]);
    if (results.length > 0) {
      res.status(200).json({
        patient_temperature_value: results[0].patient_temperature_value,
        patient_temperature_timestamp: results[0].patient_temperature_timestamp,
      });
    } else {
      res.status(401).send('No temperature data found');
    }
  } catch (error) {
    console.error(error);
    res.status(500).send('Server error');
  }
});

app.post('/grantaccess', async (req, res) => {
  const userId = req.body.userId;
  const patientId = req.body.patientId;
  const patientAccessFirstName = req.body.patientAccessFirstName;
  const patientAccessLastName = req.body.patientAccessLastName;
  const query1 = 'INSERT INTO patient_access VALUES (?, ?, ?, ?)';

  try {
    await queryDatabase(query1, [patientId, userId, patientAccessFirstName, patientAccessLastName]);
    res.status(200).send('Access Grant Successful');
  } catch (error) {
    console.error(error);
    res.status(500).send('Server error');
  }
});

app.post('/revokeaccess', async (req, res) => {
  const userId = req.body.userId;
  const patientId = req.body.patientId;
  const query1 = 'DELETE FROM patient_access WHERE user_id = ? AND patient_access_id = ?';

  try {
    const results = await queryDatabase(query1, [patientId, userId]);
    res.status(200).send('Access Revoke Successful');
  } catch (error) {
    console.error(error);
    res.status(500).send('Server error');
  }
});

app.get('/getdoctor', async (req, res) => {
  try {
    const rows = await queryDatabase('SELECT user_id, doctor_first_name, doctor_last_name FROM doctor');
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/getdoctor2', async (req, res) => {
  try {
    const rows = await queryDatabase('SELECT d.user_id, d.doctor_first_name, d.doctor_last_name FROM doctor d, patient_access p WHERE d.user_id = p.patient_access_id');
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/getmentor', async (req, res) => {
  try {
    const rows = await queryDatabase('SELECT user_id, mentor_first_name, mentor_last_name FROM mentor');
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/getmentor2', async (req, res) => {
  try {
    const rows = await queryDatabase('SELECT m.user_id, m.mentor_first_name, m.mentor_last_name FROM mentor m, patient_access p WHERE m.user_id = p.patient_access_id');
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/getReminders', async (req, res) => {
  const userId = req.query.userId;

  try {
    const results = await queryDatabase('SELECT * FROM patient_reminder WHERE user_id = ?', [userId]);
    results.forEach((reminder) => {
      reminder.patient_reminder_days = JSON.parse(reminder.patient_reminder_days);
    });
    res.status(200).send(JSON.stringify(results));
  } catch (error) {
    res.status(500).send('Error');
  }
});

app.post('/addReminder', async (req, res) => {
  const { userId, name, days, time, doses } = req.body;
  const daysJson = JSON.stringify(days);

  try {
    const result = await queryDatabase('INSERT INTO patient_reminder (user_id, patient_reminder_name, patient_reminder_days, patient_reminder_time, patient_reminder_doses, patient_reminder_taken) VALUES (?, ?, ?, ?, ?, ?)', [userId, name, daysJson, time, doses, 0]);
    res.status(200).send('Success');
  } catch (error) {
    console.error('Error:', error);
    res.status(500).send('Error');
  }
});

app.patch('/updateReminder/:id', async (req, res) => {
  const reminderId = req.params.id;
  const { taken } = req.body;

  try {
    const results = await queryDatabase('UPDATE patient_reminder SET patient_reminder_taken = ? WHERE patient_reminder_id = ?', [taken, reminderId]);
    res.status(200).send('Success');
  } catch (error) {
    res.status(500).send('Error');
  }
});

app.delete('/deleteReminder/:id', async (req, res) => {
  const reminderId = req.params.id;

  try {
    const results = await queryDatabase('DELETE FROM patient_reminder WHERE patient_reminder_id = ?', [reminderId]);
    res.status(200).send('Success');
  } catch (error) {
    res.status(500).send('Error');
  }
});