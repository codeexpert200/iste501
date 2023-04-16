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
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const app = express();
app.use(bodyParser.json());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../web')));
app.use(cors());

const connection = mysql.createPool({
  host: process.env.MYSQL_HOST,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

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

app.post('/signin', (req, res) => {
  const email = req.body.email;
  const password = req.body.password;

  const query1 = 'SELECT user_id, user_type FROM user WHERE user_email = ? AND user_password = SHA2(?, 256)';
  connection.query(query1, [email, password], (error, results) => {
    
    if (error) {
      console.error(error);
      res.status(500).send('Server error');
    } else {
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
    }
  });
});

app.post('/verifyemail', (req, res) => {
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
    connection.query(query1, [userType, token, firstName, lastName, phoneNumber, dateOfBirth, nationality, gender, bloodType, emergencyContactName, emergencyContactPhone, email, password, timestamp], (error, results) => {
      
      if (error) {
        console.error(error);
        res.status(500).send('Server error');
      }
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
      });
  });

app.post('/signup', (req, res) => {
  const token = req.body.token;
  const now = new Date();
  now.setUTCHours(now.getUTCHours() + 4);
  const timestamp = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-${String(now.getUTCDate()).padStart(2, '0')} ${String(now.getUTCHours()).padStart(2, '0')}:${String(now.getUTCMinutes()).padStart(2, '0')}:${String(now.getUTCSeconds()).padStart(2, '0')}`;
  const query1 = 'SELECT * FROM user_verify_email WHERE user_verify_email_token = ? AND user_verify_email_timestamp_expire > ?';
  connection.query(query1, [token, timestamp], (error, results1) => {
    
    if (error) {
      console.error(error);
      res.status(500).send('Server error');
    } else if (results1.length === 0) {
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
      connection.query(query2, [email, password, userType], (error, results2) => {
        
        if (error) {
          console.error(error);
          res.status(500).send('Server error');
        } else {
          if (userType == "Patient") {
            const userId = results2.insertId;
            const query3 = 'INSERT INTO patient (user_id, patient_first_name, patient_last_name, patient_phone_number, patient_date_of_birth, patient_nationality, patient_gender, patient_blood_type, patient_emergency_contact_name, patient_emergency_contact_phone) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
            connection.query(query3, [userId, firstName, lastName, phoneNumber, dateOfBirth, nationality, gender, bloodType, emergencyContactName, emergencyContactPhone], (error, results3) => {
              
              if (error) {
                console.error(error);
                res.status(500).send('Server error');
              } else {
                const query4 = 'DELETE FROM user_verify_email WHERE user_verify_email_email = ?';
                connection.query(query4, [email], (error, results4) => {
                  
                  if (error) {
                    console.error(error);
                    res.status(500).send('Server error');
                  } else {
                    res.status(200).send('Patient added');
                  }
                });
              }
            });
          }
          else {
            if (userType == "Doctor") {
              const userId = results2.insertId;
              const query5 = 'INSERT INTO doctor (user_id, doctor_first_name, doctor_last_name, doctor_phone_number, doctor_date_of_birth, doctor_nationality, doctor_gender) VALUES (?, ?, ?, ?, ?, ?, ?)';
              connection.query(query5, [userId, firstName, lastName, phoneNumber, dateOfBirth, nationality, gender], (error, results5) => {
                
                if (error) {
                  console.error(error);
                  res.status(500).send('Server error');
                } else {
                  const query6 = 'DELETE FROM user_verify_email WHERE user_verify_email_email = ?';
                  connection.query(query6, [email], (error, results6) => {
                    
                    if (error) {
                      console.error(error);
                      res.status(500).send('Server error');
                    } else {
                      res.status(200).send('Doctor added');
                    }
                  });
                }
              });
            }
            else {
              const userId = results2.insertId;
              const query7 = 'INSERT INTO mentor (user_id, mentor_first_name, mentor_last_name, mentor_phone_number, mentor_date_of_birth, mentor_nationality, mentor_gender) VALUES (?, ?, ?, ?, ?, ?, ?)';
              connection.query(query7, [userId, firstName, lastName, phoneNumber, dateOfBirth, nationality, gender], (error, results7) => {
                
                if (error) {
                  console.error(error);
                  res.status(500).send('Server error');
                } else {
                  const query8 = 'DELETE FROM user_verify_email WHERE user_verify_email_email = ?';
                  
                  connection.query(query8, [email], (error, results8) => {
                    
                    if (error) {
                      console.error(error);
                      res.status(500).send('Server error');
                    } else {
                      res.status(200).send('Mentor added');
                    }
                  });
                }
              });
            }
          }
        }
      });
    }
  });
});  

app.post('/checkemail', (req, res) => {
  const email = req.body.email;

  const query1 = 'SELECT user_email FROM user WHERE user_email = ?';
  connection.query(query1, [email], (error, results) => {
    
    if (error) {
      console.error(error);
      res.status(500).send('Server error');
    } else {
      if (results.length > 0) {
        res.status(200).json({emailMatches: true});
      } else {
        res.status(200).json({emailMatches: false});
      }
    }
  });
});

app.post('/forgotpassword', (req, res) => {
  const email = req.body.email;
  // Generate a random token
  const token = crypto.randomBytes(20).toString('hex');
  const expiresIn = 1;
  const now = new Date();
  now.setUTCHours(now.getUTCHours() + 4 + expiresIn);
  const timestamp = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-${String(now.getUTCDate()).padStart(2, '0')} ${String(now.getUTCHours()).padStart(2, '0')}:${String(now.getUTCMinutes()).padStart(2, '0')}:${String(now.getUTCSeconds()).padStart(2, '0')}`;
// Check if the email exists in the database and update the token and expiration
  const query1 = 'INSERT INTO reset_password (reset_password_token, reset_password_email, reset_password_timestamp_expire) VALUES (?, ?, ?)';
  connection.query(query1, [token, email, timestamp], (error, results) => {
    
    if (error) {
      console.error(error);
      res.status(500).send('Server error');
    }
    // Set up your email credentials and create a transporter
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
      });
    });

app.post('/resetpassword', async (req, res) => {
  const { token, newPassword } = req.body;
  const now = new Date();
  now.setUTCHours(now.getUTCHours() + 4);
  const timestamp = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-${String(now.getUTCDate()).padStart(2, '0')} ${String(now.getUTCHours()).padStart(2, '0')}:${String(now.getUTCMinutes()).padStart(2, '0')}:${String(now.getUTCSeconds()).padStart(2, '0')}`;
  // Find the user with the provided token and check if it's still valid
  const query1 = `SELECT reset_password_email FROM reset_password WHERE reset_password_token = ? AND reset_password_timestamp_expire > ?`;
  connection.query(query1, [token, timestamp], async (err, result) => {
    
    if (err) throw err;

    if (result.length === 0) {
      res.status(400).send('Invalid or expired token');
      return;
    }
    else {
      const email = result[0].reset_password_email;
      const query2 = `UPDATE user SET user_password = SHA2(?, 256) WHERE user_email = ?`;
      connection.query(query2, [newPassword, email], (err, results) => {
        
        if (err) throw err;

        if (result.length === 0) {
          res.status(400).send('Email does not exist');
          return;
        }
        else {
          const query3 = 'DELETE FROM reset_password WHERE reset_password_email = ?';
          connection.query(query3, [email], (error, results3) => {
            
            if (error) {
              console.error(error);
              res.status(500).send('Server error');
            } else {
              res.status(200).send('Password reset successful');
            }
          });
        }
      });
    }
  });
});

app.post('/uploadmedicalrecord', upload.fields([{ name: 'pdf_data', maxCount: 1 }]), (req, res) => {
  const userId = parseInt(req.body.user_id);
  console.log('Request body:', req.body);
  const pdfData = req.files.pdf_data[0].buffer.toString('base64');
  const fileName = req.body.file_name;
  const fileSize = parseInt(req.body.file_size, 10);
  const now = new Date();
  now.setUTCHours(now.getUTCHours() + 4);
  const timestamp = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-${String(now.getUTCDate()).padStart(2, '0')} ${String(now.getUTCHours()).padStart(2, '0')}:${String(now.getUTCMinutes()).padStart(2, '0')}:${String(now.getUTCSeconds()).padStart(2, '0')}`;
  const query1 = 'INSERT INTO patient_medical_record (patient_id, patient_medical_record_name, patient_medical_record_size, patient_medical_record_file, patient_medical_record_timestamp_create) VALUES (?, ?, ?, ?, ?)';
  connection.query(query1, [userId, fileName, fileSize, Buffer.from(pdfData, 'base64'), timestamp], (error, results) => {
    
    if (error) {
      console.error(error);
      res.status(500).send('Server error');
    } else {
      res.status(200).send('File uploaded successfully');
    }
  });
});

app.post('/getheartrate', (req, res) => {
  const userId = req.body.userId;

  const query1 = 'SELECT patient_heart_rate_value, patient_heart_rate_timestamp FROM patient_heart_rate WHERE patient_id = ?';
  connection.query(query1, [userId], (error, results) => {
    
    if (error) {
      console.error(error);
      res.status(500).send('Server error');
    } else {
      if (results.length > 0) {
        res.status(200).json({
          patient_heart_rate_value: results[0].patient_heart_rate_value,
          patient_heart_rate_timestamp: results[0].patient_heart_rate_timestamp,
        });
      } else {
        res.status(401).send('No heart rate data found');
      }
    }
  });
});

app.post('/gettemperature', (req, res) => {
  const userId = req.body.userId;

  const query1 = 'SELECT patient_temperature_value, patient_temperature_timestamp FROM patient_temperature WHERE patient_id = ?';
  connection.query(query1, [userId], (error, results) => {
    
    if (error) {
      console.error(error);
      res.status(500).send('Server error');
    } else {
      if (results.length > 0) {
        res.status(200).json({
          patient_temperature_value: results[0].patient_temperature_value,
          patient_temperature_timestamp: results[0].patient_temperature_timestamp,
        });
      } else {
        res.status(401).send('No temperature data found');
      }
    }
  });
});

app.post('/grantaccess', (req, res) => {
  const userId = req.body.userId;
  const patientId = req.body.patientId;
  const patientAccessFirstName = req.body.patientAccessFirstName;
  const patientAccessLastName = req.body.patientAccessLastName;

  const query1 = 'INSERT INTO patient_access VALUES (?, ?, ?, ?)';
  connection.query(query1, [patientId, userId, patientAccessFirstName, patientAccessLastName], (error, results) => {
    if (error) {
      console.error(error);
      res.status(500).send('Server error');
    } else {
      res.status(200).send('Access Grant Successful');
    }
  });
});

app.post('/revokeaccess', (req, res) => {
  const userId = req.body.userId;
  const patientId = req.body.patientId;

  const query1 = 'DELETE FROM patient_access WHERE user_id = ? AND patient_access_id = ?';
  connection.query(query1, [patientId, userId], (error, results) => {
    if (error) {
      console.error(error);
      res.status(500).send('Server error');
    } else {
      res.status(200).send('Access Revoke Successful');
    }
  });
});

app.get('/getdoctor', async (req, res) => {
  try {
    const [rows] = await connection2.query('SELECT user_id, doctor_first_name, doctor_last_name FROM doctor');
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/getdoctor2', async (req, res) => {
  try {
    const [rows] = await connection2.query('SELECT d.user_id, d.doctor_first_name, d.doctor_last_name FROM doctor d, patient_access p WHERE d.user_id = p.patient_access_id');
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/getmentor', async (req, res) => {
  try {
    const [rows] = await connection2.query('SELECT user_id, mentor_first_name, mentor_last_name FROM mentor');
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/getmentor2', async (req, res) => {
  try {
    const [rows] = await connection2.query('SELECT m.user_id, m.mentor_first_name, m.mentor_last_name FROM mentor m, patient_access p WHERE m.user_id = p.patient_access_id');
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});