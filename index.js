import 'package:flutter/material.dart';
import 'package:project/patient_manage_medical_records.dart';
import 'package:project/signin.dart';
import 'package:project/patient_home.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'dart:async';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:provider/provider.dart';
import 'package:project/theme_manager.dart';
import 'package:intl/intl.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';

class PatientViewStatisticalDataScreen extends StatefulWidget {
  @override
  _PatientViewStatisticalDataScreenState createState() => _PatientViewStatisticalDataScreenState();
}

class _PatientViewStatisticalDataScreenState extends State<PatientViewStatisticalDataScreen> {
  int _currentIndex = 0;
  late ConnectivityResult _connectivityResult = ConnectivityResult.none;
  Connectivity _connectivity = Connectivity();
  final double appBarHeight = AppBar().preferredSize.height;
  final List<Widget> _children = [
    HeartRate(),
    Temperature(),
  ];
  PageController _pageController = PageController(initialPage: 0);

  @override
  void initState() {
    super.initState();
    _checkConnection();
  }

  Future<void> _checkConnection() async {
    _connectivityResult = await _connectivity.checkConnectivity();
    setState(() {});
    if (_connectivityResult == ConnectivityResult.none) {
      final snackBar = SnackBar(
        content: Text(
          'No Network Connectivity',
          textAlign: TextAlign.center,
          style: TextStyle(color: Theme.of(context).accentColor),
        ),
        backgroundColor: Provider.of<ThemeManager>(context, listen: false).themeData.snackBarColor,
        duration: Duration(seconds: 5),
      );
      ScaffoldMessenger.of(context).showSnackBar(snackBar);
    }
  }

  @override
  Widget build(BuildContext context) {
    return WillPopScope(
      onWillPop: () async {
        Navigator.pushReplacement(
          context,
          MaterialPageRoute(
            builder: (context) => PatientHomeScreen(),
          ),
        );
        return false;
      },
      child: Scaffold(
          appBar: AppBar(
            backgroundColor: Provider.of<ThemeManager>(context, listen: false).themeData.appBarColor,
            leading: IconButton(
                icon: Icon(Icons.arrow_back),
                onPressed: () {
                  Navigator.pushReplacement(
                    context,
                    MaterialPageRoute(
                      builder: (context) => PatientHomeScreen(),
                    ),
                  );
                }),
            bottom: PreferredSize(
              preferredSize: Size.fromHeight(40.0),
              child: FlexibleSpaceBar(
                centerTitle: true,
                title: Text(
                  'Statistical Data',
                  style: TextStyle(fontSize: 20.0, color: Theme.of(context).accentColor),
                  textAlign: TextAlign.center,
                ),
              ),
            ),
          ),
          body: Column(
            children: [
              Expanded(
                child: PageView(
                  controller: _pageController,
                  onPageChanged: (index) {
                    setState(() {
                      _currentIndex = index;
                    });
                  },
                  children: _children,
                ),
              ),
              BottomNavigationBar(
                currentIndex: _currentIndex,
                onTap: onTabTapped,
                selectedItemColor: Theme.of(context).brightness == Brightness.dark ? Colors.green : Colors.blue,
                unselectedItemColor: Theme.of(context).brightness == Brightness.dark ? Colors.white : Colors.grey,
                items: [
                  BottomNavigationBarItem(
                    icon: Icon(Icons.favorite),
                    label: 'Heart Rate',
                    backgroundColor: Provider.of<ThemeManager>(context, listen: false).themeData.appBarColor,
                  ),
                  BottomNavigationBarItem(
                    icon: Icon(Icons.thermostat),
                    label: 'Temperature',
                    backgroundColor: Provider.of<ThemeManager>(context, listen: false).themeData.appBarColor,
                  ),
                ],
              ),
            ],
          )),
    );
  }

  void onTabTapped(int index) {
    setState(() {
      _currentIndex = index;
    });
    _pageController.animateToPage(
      index,
      duration: Duration(milliseconds: 500),
      curve: Curves.easeInOut,
    );
  }
}

class HeartRate extends StatelessWidget {
  late int patient_heart_rate_value = 0;
  late String patient_heart_rate_timestamp = "";

  Future<void> fetchLatestHeartRateData() async {
    SharedPreferences prefs = await SharedPreferences.getInstance();
    int user_id = prefs.getInt('user_id') ?? 0;
    final response = await http.post(
      Uri.parse('https://m-d5jo.onrender.com/getheartrate'),
      headers: {'Content-Type': 'application/json'},
      body: '{"userId": "$user_id"}',
    );
    if (response.statusCode == 200) {
      Map<String, dynamic> jsonResponse = jsonDecode(response.body);
      patient_heart_rate_value = jsonResponse['patient_heart_rate_value'];
      patient_heart_rate_timestamp = jsonResponse['patient_heart_rate_timestamp'];
    } else {
      patient_heart_rate_value = 0;
      patient_heart_rate_timestamp = "";
    }
  }
  // Implement the logic to fetch the latest heart rate data from your Node.js API

  @override
  Widget build(BuildContext context) {
    return Center(
      child: FutureBuilder<void>(
          future: fetchLatestHeartRateData(),
          builder: (context, snapshot) {
            return Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: <Widget>[
                Container(
                  padding: EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(10),
                    color: Provider.of<ThemeManager>(context, listen: false).themeData.appBarColor,
                  ),
                  child: Column(
                    children: [
                      Text(
                        'Heart Rate',
                        style: TextStyle(
                          fontSize: 20,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      SizedBox(height: 10),
                      Text(
                        '${patient_heart_rate_value} BPM',
                        style: TextStyle(
                          fontSize: 40,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ],
                  ),
                ),
                SizedBox(height: 20),
                Text(
                  'Last updated ${patient_heart_rate_timestamp} minutes ago',
                  style: TextStyle(
                    fontSize: 16,
                    fontStyle: FontStyle.italic,
                  ),
                ),
              ],
            );
          }),
    );
  }
}

class Temperature extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Center(
      child: ListView(
        padding: EdgeInsets.symmetric(vertical: 50, horizontal: 50),
        children: <Widget>[],
      ),
    );
  }
}
