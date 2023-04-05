const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql2');
const cors = require('cors');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const path = require('path');
const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const app = express();
app.use(bodyParser.json());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../web')));
app.use(cors());

const connection = mysql.createConnection({
  host: process.env.MYSQL_HOST,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
});
connection.connect((err) => {
  if (err) throw err;
  console.log(`MySQL running on port 3306`);
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
          // Handle other user types here
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
      } else {
        res.status(401).send('User unauthorized');
      }
    }
  });
});

app.post('/signup', (req, res) => {
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

    const query1 = 'INSERT INTO user (user_email, user_password, user_type) VALUES (?, SHA2(?, 256), ?)';
    connection.query(query1, [email, password, "Patient"], (error, results) => {
        if (error) {
            console.error(error);
            res.status(500).send('Server error');
        } else {
            const userId = results.insertId;
            const query2 = 'INSERT INTO patient (user_id, patient_first_name, patient_last_name, patient_phone_number, patient_date_of_birth, patient_nationality, patient_gender, patient_blood_type, patient_emergency_contact_name, patient_emergency_contact_phone) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
            connection.query(query2, [userId, firstName, lastName, phoneNumber, dateOfBirth, nationality, gender, bloodType, emergencyContactName, emergencyContactPhone], (error, results) => {
                if (error) {
                    console.error(error);
                    res.status(500).send('Server error');
                } else {
                    res.status(200).send('Patient added');
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

  // Check if the email exists in the database and update the token and expiration
  const query1 = `UPDATE user SET user_password_reset_token = ?, user_password_reset_expire = DATE_ADD(NOW(), INTERVAL 1 HOUR) WHERE user_email = ?`;
  connection.query(query1, [token, email], (err, result) => {
    if (err) throw err
    if (result.changedRows === 0) {
      res.status(400).send('Email not found');
      return;
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
  // Find the user with the provided token and check if it's still valid
  const query1 = `SELECT * FROM user WHERE user_password_reset_token = ? AND user_password_reset_expire > NOW()`;
  connection.query(query1, [token], async (err, result) => {
    if (err) throw err;

    if (result.length === 0) {
      res.status(400).send('Invalid or expired token');
      return;
    }
    else {
      const query2 = `UPDATE user SET user_password = SHA2(?, 256), user_password_reset_token = NULL, user_password_reset_expire = NULL WHERE user_id = ?`;
      connection.query(query2, [newPassword, result[0].user_id], (err, results) => {
        if (err) throw err;

        if (result.length === 0) {
          res.status(400).send('Invalid or expired token');
          return;
        }
        else {
          res.status(200).send('Password updated');
        }
      });
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

const PORT = process.env.PORT;
app.listen(PORT, () => {
  console.log(`Node.js running on port ${PORT}`);
});
