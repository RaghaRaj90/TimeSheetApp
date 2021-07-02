var db;
var datatosend;
var Checkout;
var diaginfo;
function startup() {//Create the database
    console.log("Starting up...");
    db = window.openDatabase("EventDetails123", "1", "EngTimeSheet Database", 1000000);
    db.transaction(initDB, dbError, dbReady);

}

function dbError(e) {
    console.log("SQL ERROR" + e);
}

function initDB(tx) { // create table
    tx.executeSql("DROP TABLE IF EXISTS EventDetails123");
    tx.executeSql("create table if not exists EventDetails123(EngineerName TEXT collate nocase ,AttendanceDate DATETIME ,Event TEXT ,StartTime DATETIME ,EndTime DATETIME,AdditionalDetails TEXT, AddressDetails TEXT )");
}

function dbReady() {

    console.log("DB initialization done.");
}
function AddEvent(EngName, AttenDate, EventDetail, EventStartTime, EventEndTime, Addon, Address) { // Add an event to the local database

    db = window.openDatabase("EventDetails123", "1", "EngTimeSheet Database", 1000000);
    db.transaction(function (tx) {
        //tx.executeSql ("DROP TABLE IF EXISTS EventDetails123");
        //tx.executeSql("create table if not exists EventDetails123(EngineerName TEXT ,AttendanceDate DATETIME ,Event TEXT ,StartTime DATETIME ,EndTime DATETIME,AdditionalDetails TEXT,AddressDetails TEXT )");
        if (EventDetail == "START WORK") {
            //alert(EventDetail);
            tx.executeSql("INSERT INTO EventDetails123(EngineerName,AttendanceDate,Event,StartTime,EndTime,AdditionalDetails,AddressDetails) VALUES (?,?,?,?,?,?,?)", [EngName, AttenDate, EventDetail, EventStartTime, EventEndTime, Addon, Address], StartLoad(EngName, AttenDate, 2), dbError);
            //window.localStorage.setItem("LastCheckinDate", AttenDate);
            //window.localStorage.setItem("LastCheckinTime", EventEndTime);
        }
        else {
             tx.executeSql("INSERT INTO EventDetails123(EngineerName,AttendanceDate,Event,StartTime,EndTime,AdditionalDetails,AddressDetails) VALUES (?,?,?,?,?,?,?)", [EngName, AttenDate, EventDetail, EventStartTime, EventEndTime, Addon, Address]);
        }

       alert(EventDetail + " insert Complete");


    });



}

function PopulateDropDown(EngName) {
    $.ajax({
        type: "GET",
        url: "https://www.aggoraonline.co.uk/EngTimeSheetApp/api/EngineerEvent?EngName=" + EngName,
        dataType: "json",
        success: function (data) {
            if (data.length >= 0) {
                var Event = document.getElementById("EventList");

                for (var i = 0; i < data.length; i++) {
                    var option = document.createElement("option");
                    option.text = data[i];
                    option.value = data[i];
                    Event.appendChild(option);
                }


            }
            else {
                alert("No data to be retrieved from the server");
            }
        },
        error: function (xhr) {
            alert("Unable to retrieve data from the server");
        }
    });

}

function AddCheckoutEvent(EngName, AttenDate, EventDetail, EventStartTime, EventEndTime, Addon, Address) {

    if (EventDetail == "SICK") {

        db.transaction(function (tx) {
            tx.executeSql("INSERT INTO EventDetails123(EngineerName,AttendanceDate,Event,StartTime,EndTime,AdditionalDetails,AddressDetails) VALUES (?,?,?,?,?,?,?)", [EngName, AttenDate, EventDetail, EventStartTime, EventEndTime, Addon, Address], StartLoad(EngName, AttenDate, 1), dbError);

        });
    }
    else {
        if (new Date(EventStartTime) < new Date(localStorage.getItem("LastCheckinTime"))) { // to prevent checking out before check-in time
            alert("Can't check out before the check-in time");
            location.reload();
        }
        else {

            if (((new Date(EventStartTime) - new Date(localStorage.getItem("maxEndTime"))) / 60000) <= 15) { // if checkout time is later than 15 minutes from the last event recorded
                db = window.openDatabase("EventDetails123", "1", "EngTimeSheet Database", 1000000);

                db.transaction(function (tx) {
                    tx.executeSql("INSERT INTO EventDetails123(EngineerName,AttendanceDate,Event,StartTime,EndTime,AdditionalDetails,AddressDetails) VALUES (?,?,?,?,?,?,?)", [EngName, AttenDate, EventDetail, EventStartTime, EventEndTime, Addon, Address], StartLoad(EngName, AttenDate, 1), dbError);

                });
            }
            else {
                alert("Check out failed as there is more than 15 minutes interval between last event and attempted checkout");
                location.reload();

            }
        }
    }
   // alert(EngName);

}

function GetJobDetails(EngName, AttendDate) { //Retrieve timesheet details from the remote DB

    $.ajax({
        type: "GET",
        url: "https://www.aggoraonline.co.uk/EngTimeSheetApp/api/EngineerEvent?EngName=" + EngName + "&AttenDate=" + AttendDate,
        dataType: "json",
        success: function (data) {
            if (data.length >= 0) {
                db = window.openDatabase("EventDetails123", "1", "EngTimeSheet Database", 1000000);
                var datavalue = data;
                var myJsonObj = datavalue;
                var e1 = [];
                db.transaction(function (ctx) {
                    for (i = 0; i < data.length; i++) {
                        e1 = myJsonObj[i];
                        //ctx.executeSql("create table if not exists EventDetails123(EngineerName TEXT ,AttendanceDate DATETIME ,Event TEXT ,StartTime DATETIME ,EndTime DATETIME,AdditionalDetails TEXT,AddressDetails TEXT  )");
                        ctx.executeSql("INSERT INTO EventDetails123(EngineerName,AttendanceDate,Event,StartTime,EndTime,AdditionalDetails,AddressDetails) VALUES (?,?,?,?,?,?,?)", [e1.EngineerName, e1.AttendanceDate, e1.Event, e1.StartTime, e1.EndTime, e1.AdditionalDetails, e1.AddressDetails], dbError, dbReady);


                    }
                });
                //alert("Finished retreiving from the server");
                //PopulateEvent();
                //location.reload();
                window.localStorage.setItem("LastSyncTime", new Date());
            }
            else {
                alert("No data to be retrieved from the server");
            }

        },
        error: function (xhr) {
            alert("Unable to retrieve data from the server");
        }
    });
}


function GetVehicleStatus(EngName, AttendDate) { //Retrieve vehicle status details from the remote DB
    //alert("Retrieving from the server");
    $.ajax({
        type: "GET",
        url: "https://www.aggoraonline.co.uk/EngTimeSheetApp/api/EngineerEvent?EngName=" + EngName + "&AttenDate=" + AttendDate + "&test=" + 1,
        dataType: "json",
        success: function (data) {
            window.localStorage.setItem("VehicleStatus", data);

        },
        error: function (xhr) {
            alert("Unable to retrieve vehicle status from the server");
        }
    });
}


function GetDayEvent(EngineerName, Attendate) { // Get all the event for a particular from the local DB
    var event;
    var start;
    var end;
    var count = 0;
    var PreviousStart = null;
    var PreviousEnd = null;
    var EventName = new Array();
    var EventStartTime = new Array();
    var EventEndTime = new Array();
    var EventAdditionalDetails = new Array();
    var EventAddressDetails = new Array();
    window.localStorage.setItem("BreakCount", 0);
    db = window.openDatabase("EventDetails123", "1", "EngTimeSheet Database", 1000000);
    db.transaction(function (tx) {
        tx.executeSql("select distinct * from EventDetails123 where EngineerName =? and AttendanceDate=? order by StartTime ASC", [EngineerName, Attendate], function (tx, results) {

            if (results.rows.length > 0) {
                for (var i = 0; i < results.rows.length; i++) {     //For each record in the local DB create an event and populate the DayPilot calendar

                    //EventName[i] = results.rows.item(i).Event;
                    EventName.push(results.rows.item(i).Event);
                    EventStartTime.push(results.rows.item(i).StartTime);
                    EventEndTime.push(results.rows.item(i).EndTime);
                    EventAdditionalDetails.push(results.rows.item(i).AdditionalDetails);
                    EventAddressDetails.push(results.rows.item(i).AddressDetails);



                    if (EventName[i].trim() != "FINISH WORK" && EventName[i].trim() != "STANDSTILL" && EventName[i].trim() != "START WORK") {  // Exclude the STOP details
                        if (PreviousEnd != null) {
                            var timeDiff = (new Date(EventStartTime[i]) - new Date(PreviousEnd)) / (60000);
                            if (timeDiff > 15 && new Date(EventStartTime[i]) > new Date(localStorage.getItem("LastCheckinTime")))
                                count++;
                        }
                        if (new Date(PreviousEnd) <= new Date(EventEndTime[i])) {
                            PreviousEnd = EventEndTime[i];
                        }

                        //CreateEvent(EventName[i], EventStartTime[i], EventEndTime[i], EventAdditionalDetails[i], EventAddressDetails[i]);
                    }
                    //window.localStorage.setItem("BreakCount", count);
                    CreateEvent(EventName[i], EventStartTime[i], EventEndTime[i], EventAdditionalDetails[i], EventAddressDetails[i]);

                }

            }
            else {
                alert("No records to retrieve");

            }


        });

    });

}

function ClearTable(EngineerName, AttenDate) {

    db = window.openDatabase("EventDetails123", "1", "EngTimeSheet Database", 1000000);
    db.transaction(function (tx) {
        alert("Table Dropped");
        //tx.executeSql("Delete from EventDetails123 where EngineerName =? and AttendanceDate=? ", [EngineerName, AttenDate]);
        tx.executeSql("DROP TABLE EventDetails123");


    });

}


function DeleteRecord(EngineerName, AttenDate, Event, StartTime) {

    db = window.openDatabase("EventDetails123", "1", "EngTimeSheet Database", 1000000);
    db.transaction(function (tx) {
        alert("Record Deleted");
        //tx.executeSql("Delete from EventDetails123 where EngineerName =? and AttendanceDate=? and Event =? and StartTime=?  ", [EngineerName, AttenDate, Event,StartTime]);
        tx.executeSql("DROP TABLE EventDetails123");


    });

}


function DropTable(tx) {

    //alert("Table Drop")
    tx.executeSql("DROP TABLE EventDetails123");


}


function StartLoad(EngineerName, AttenDate, CheckoutType) {  // Retrieve data from the local DB for a particular day
    Checkout = CheckoutType;
    db = window.openDatabase("EventDetails123", "1", "EngTimeSheet Database", 1000000);
    //alert("StartLoad " + Checkout);
    db.transaction(function (tx) {

        tx.executeSql("select distinct * from EventDetails123 where EngineerName =? and AttendanceDate=? order by StartTime ASC", [EngineerName, AttenDate], SendDetails, dbError)

    });

}

function SendDetails(tx, results) {          // function to send data to the remote DB
    var len = results.rows.length;
    var EventName = new Array();
    var EventStartTime = new Array();
    var EventEndTime = new Array();
    var EventAdditionalDetails = new Array();
    var EngName = new Array();
    var AttendanceDate = new Array();
    var EventAddressDetails = new Array()

    console.log("DEMO table: " + len + " rows found.");
    for (var i = 0; i < len; i++) {
        EngName.push(results.rows.item(i).EngineerName);
        AttendanceDate.push(results.rows.item(i).AttendanceDate);
        EventName.push(results.rows.item(i).Event);
        EventStartTime.push(results.rows.item(i).StartTime);
        EventEndTime.push(results.rows.item(i).EndTime);
        EventAdditionalDetails.push(results.rows.item(i).AdditionalDetails);
        EventAddressDetails.push(results.rows.item(i).AddressDetails);

    }
    var Eventdata = JSON.stringify({
        EngineerName: EngName,
        AttendanceDate: AttendanceDate,
        Event: EventName,
        AdditionalDetails: EventAdditionalDetails,
        StartTime: EventStartTime,
        EndTime: EventEndTime,
        AddressDetails: EventAddressDetails,
    });

    console.log("Sending data to the server");

    $.ajax({    // Post the data back to the Server
        type: "POST",
        data: Eventdata,
        crossDomain: true,
        withCredentials: true,
        url: "https://www.aggoraonline.co.uk/EngTimeSheetApp/api/EngineerEvent",
        contentType: "application/json",
        traditional: true,
        success: function () {

            //alert(EngName[0] + AttendanceDate[0]);

            if (Checkout == 1) {
                alert('Thanks for submitting your timesheet');
                db.transaction(DropTable);
                window.localStorage.removeItem("LastCheckinDate");
                window.localStorage.removeItem("LastCheckinTime");
                window.localStorage.removeItem("BreakCount");
                window.localStorage.removeItem("BreakCountBeforeCheckout");

                window.location.href = 'Navigation.html';
            }
            else {
                window.localStorage.setItem("LastCheckinDate", AttendanceDate[0]);
                window.localStorage.setItem("LastCheckinTime", EventEndTime[0]);

                //GetJobDetails(EngineerName, CurrentDateTime);
                window.location.href = 'TimeSheet.html';
            }

        },
        error: function () {
            alert('Failed loading data. Please retry');
            Result = 0;
            StartLoad(EngName[0], AttendanceDate[0]);
        }
    });


}

function GetLastStandStill(EngineerName, CheckinDate) { // Get the standstill time for the last trip
    db = window.openDatabase("EventDetails123", "1", "EngTimeSheet Database", 1000000);
    db.transaction(function (tx) {
        tx.executeSql("select * from EventDetails123 where EngineerName =? and AttendanceDate=? and Event like ?  order by StartTime DESC", [EngineerName, CheckinDate, 'TRIP%'], GetStandStill, dbError)
    });
}
function GetStandStill(tx, results) {
    var len = results.rows.length;
    var EngName;
    var AttenDate;
    var EndTime;
    for (var i = 0; i < len; i++) {
        EngName = results.rows.item(0).EngineerName;
        AttenDate = results.rows.item(0).AttendanceDate;
        EndTime = results.rows.item(0).EndTime;

    }

    $.ajax({        // ajax call to get the infomation forom the remote server
        type: "GET",
        url: "https://www.aggoraonline.co.uk/EngTimeSheetApp/api/EngineerEvent?EngName=" + EngName + "&AttenDate=" + AttenDate + "&LastStop=" + EndTime,
        dataType: "json",
        success: function (data) {
            if (data != null && data.length >= 0) {
                db = window.openDatabase("EventDetails123", "1", "EngTimeSheet Database", 1000000);
                var datavalue = data;

                db.transaction(function (ctx) {
                    alert(datavalue);
                    ctx.executeSql("create table if not exists EventDetails123(EngineerName TEXT collate nocase,AttendanceDate DATETIME ,Event TEXT ,StartTime DATETIME ,EndTime DATETIME,AdditionalDetails TEXT,AddressDetails TEXT  )");
                    ctx.executeSql("INSERT INTO EventDetails123(EngineerName,AttendanceDate,Event,StartTime,EndTime,AdditionalDetails,AddressDetails) VALUES (?,?,?,?,?)", [EngName, CheckinDate, 'STANDSTILL', datavalue, EndTime], dbError, dbReady);
                    CreateEvent('STANDSTILL', datavalue, EndTime, '', '');


                });
                // alert("Finished retreiving from the server");
                //PopulateEvent();
                //location.reload();
            }
            else {
                //alert("No data to be retrieved from the server");
            }

        },
        error: function (xhr) {
            alert("Unable to retrieve data from the server");
        }
    });



}

function UpdateEvent(EngineerName, CheckinDate, OldStart, OldEnd, newStart, newEnd) { // Update the event when drag and drop
    db = window.openDatabase("EventDetails123", "1", "EngTimeSheet Database", 1000000);
    db.transaction(function (tx) {
        tx.executeSql("UPDATE EventDetails123 SET StartTime =?, EndTime =? WHERE EngineerName=? and AttendanceDate =? and startTime=? and EndTime =?", [newStart, newEnd, EngineerName, CheckinDate, OldStart, OldEnd], dbReady, dbError)
        location.reload();
    });
}



function DeleteEvent(EngineerName, CheckinDate, str, startTime, endTime) { // Delete the  event
    db = window.openDatabase("EventDetails123", "1", "EngTimeSheet Database", 1000000);
    db.transaction(function (tx) {
        tx.executeSql("DELETE FROM EventDetails123 WHERE EngineerName=? and AttendanceDate =? and Event like ? and startTime=? and EndTime =?", [EngineerName, CheckinDate, '%' + str + '%', startTime, endTime], dbReady, dbError)
        console.log("Deletion successful");
        location.reload();
    });
}

function GetMaxTime(EngineerName, CheckinDate) {
    var maxtime;
    db = window.openDatabase("EventDetails123", "1", "EngTimeSheet Database", 1000000);
    db.transaction(function (tx) {
        tx.executeSql("select max(EndTime) as maxTime from EventDetails123 where EngineerName =? and AttendanceDate=? ", [EngineerName, CheckinDate], function (tx, results) {
            if (results.rows.length > 0) {

                maxtime = results.rows.item(0).maxTime;
                window.localStorage.setItem("maxEndTime", maxtime);
                //alert(localStorage.getItem("maxEndTime"))


            }

        });
    });
}



function backupContent(EngName, Attendate) {
    db = window.openDatabase("EventDetails123", "1", "EngTimeSheet Database", 1000000);
    db.transaction(function (tx) {
        tx.executeSql("select distinct * from EventDetails123 where EngineerName =?  and AttendanceDate =? Order by StartTime ASC", [EngName, Attendate], SendDiagnostics, dbError)

    });

}



function SendDiagnostics(tx, results) {          // function to send diagnostics to the remote DB
    var len = results.rows.length;
    var EventName = new Array();
    var EventStartTime = new Array();
    var EventEndTime = new Array();
    var EventAdditionalDetails = new Array();
    var EngName = new Array();
    var AttendanceDate = new Array();
    var EventAddressDetails = new Array()
    console.log("Diagnostics table: " + len + " rows found.");
    if (len > 0) {
        for (var i = 0; i < len; i++) {
            EngName.push(results.rows.item(i).EngineerName);
            AttendanceDate.push(results.rows.item(i).AttendanceDate);
            EventName.push(results.rows.item(i).Event);
            EventStartTime.push(results.rows.item(i).StartTime);
            EventEndTime.push(results.rows.item(i).EndTime);
            EventAdditionalDetails.push(results.rows.item(i).AdditionalDetails);
            EventAddressDetails.push(results.rows.item(i).AddressDetails);
        }
        var Eventdata = JSON.stringify({
            EngineerName: EngName,
            AttendanceDate: AttendanceDate,
            Event: EventName,
            AdditionalDetails: EventAdditionalDetails,
            StartTime: EventStartTime,
            EndTime: EventEndTime,
            AddressDetails: EventAddressDetails,
        });

        console.log("Sending diagnostics to the server");

        $.ajax({    // Post the data back to the Server
            type: "POST",
            data: Eventdata,
            crossDomain: true,
            withCredentials: true,
            url: "https://www.aggoraonline.co.uk/EngTimeSheetApp/api/Account",
            contentType: "application/json",
            traditional: true,
            success: function () {
                alert('Thanks for sending diagnostic information');
                //alert(EngName[0] + AttendanceDate[0]);

            },
            error: function () {
                alert('Failed loading data. Please retry');

            }
        });

    }
    else {
        alert('No records to send');
    }


}





function TestPing() { // Test Ping
     $.ajax({
        type: "GET",
        url: "https://www.aggoraonline.co.uk/EngTimeSheetApp/api/account",
        dataType: "json",
        success: function (data) {
            if (data == 1) {
                alert('Connection to the server successful');
                window.localStorage.setItem("ConfirmBox", 2);
            }
            else {
                alert('Connection to the server successful');
                window.localStorage.setItem("ConfirmBox", 2);
            }
        },
        error: function (e) {
            alert('Unable to reach the server');

        }
    });
}


function CalculateBreakCount(EngineerName,CheckoutTime) { // Calculate the no.breaks from checkin to checkcout
    var count = 0;
    var PreviousStart = null;
    var PreviousEnd = null;
    var EventName = null;
    var EventStartTime = null;
    var EventEndTime = null;
    db = window.openDatabase("EventDetails123", "1", "EngTimeSheet Database", 1000000);
    db.transaction(function (tx) {
        tx.executeSql("select distinct * from EventDetails123 where EngineerName =? and StartTime <= ? order by StartTime ASC", [EngineerName, CheckoutTime], function (tx, results) {
            if (results.rows.length > 0) {
                for (var i = 0; i < results.rows.length; i++) {

                    EventName = results.rows.item(i).Event;
                    EventStartTime = results.rows.item(i).StartTime;
                    EventEndTime = results.rows.item(i).EndTime;


                    if (EventName.trim() != "FINISH WORK" && EventName.trim() != "STANDSTILL" && EventName.trim() != "START WORK") {  // Exclude the STOP details
                        if (PreviousEnd != null) {
                            var timeDiff = (new Date(EventStartTime) - new Date(PreviousEnd)) / (60000);
                            if (timeDiff > localStorage.getItem("CalendarMinutes") && new Date(EventStartTime) > new Date(localStorage.getItem("LastCheckinTime")) && new Date(EventStartTime)<= new Date(CheckoutTime))
                                count++;
                            //alert(count)
                        }
                        if (new Date(PreviousEnd) <= new Date(EventEndTime)) {
                            PreviousEnd = EventEndTime;
                        }

                        //CreateEvent(EventName[i], EventStartTime[i], EventEndTime[i], EventAdditionalDetails[i], EventAddressDetails[i]);
                    }
                    window.localStorage.setItem("BreakCountBeforeCheckout", count);
                }
            }
        });
    });
}

function ClearCalendar() {
    var Engname = localStorage.getItem("EngineerName");
    var AttenDate = localStorage.getItem("LastCheckinDate");
    db = window.openDatabase("EventDetails123", "1", "EngTimeSheet Database", 1000000);
    db.transaction(function (tx) {

        tx.executeSql("Delete from EventDetails123 where EngineerName =? and AttendanceDate=? ", [Engname, AttenDate]);
        //tx.executeSql("DROP TABLE EventDetails123");
    });


    window.localStorage.removeItem("LastCheckinDate");
    window.localStorage.removeItem("LastCheckinTime");
    window.localStorage.removeItem("BreakCountBeforeCheckout");
    alert('Cleared the timesheet for: ' + AttenDate);
    window.location.href = 'Navigation.html';

}

function LastCheckin(EngineerName) { // Get the last check in date for an engineer
    $.ajax({
        type: "GET",
        url: "https://www.aggoraonline.co.uk/EngTimeSheetApp/api/account?Engname=" + EngineerName,
        dataType: "json",
        success: function (data) {
            window.localStorage.setItem("MaxCheckinDate", data);
            var datepick = document.getElementById("datepicker");
            datepick.style.visibility = "visible";


        },
        error: function (e) {
            alert('Unable to reach the server');

        }
    });
}
 function GetAnnouncements (EngineerName, CurrentDate){ // Get all the announcements for an engineer
	     $.ajax({
	         type: "GET",
	         url: "http://localhost:52422/api/Account?Engineername=" + EngineerName +"&CurrentDate=" +CurrentDate,
	         dataType: "json",
	         success: function (data) {
				var trHTML = '';
				$.each(data, function (i, item) {
					 trHTML += "<tr><td>" + item.EngineerName + "</td><td>" + item.Announcement + "</td><td>" + item.AnnouncementDate + "</td><td>"+ item.AnnouncementCreatedBy +"</td><td> <input type='submit' id='markasdone' value='Done' style='height:20px' onclick='MarkAsDone("+item.IDno+")' ></td></tr>";

					});
					$('#records_table').append(trHTML);
	         },
	         error: function (e) {
	             alert('Unable to reach the server');

	         }
    });
}

function MarkAsDone(Idno){

        $.ajax({    // Post the announcement complete back to the Server
            type: "POST",

            crossDomain: true,
            withCredentials: true,
            url: "http://localhost:52422/api/Account?Announcementid="+Idno,
            contentType: "application/json",
            traditional: true,
            success: function () {
                alert('Thanks for marking it as done');
                //alert(EngName[0] + AttendanceDate[0]);
				location.reload();
            },
            error: function () {
                alert('Failed loading data. Please retry');

            }
        });
}


function GetControls (){ // Get all the announcements for an engineer
       $.ajax({
           type: "GET",
            url:"https://www.aggoraonline.co.uk/EngTimeSheetApp/api/Account?dd=2020-04-03",
            dataType: "json",
            success: function (data) {
            $.each(data, function (i, item) {

                window.localStorage.setItem(item.Control, item.Value);
                console.log("Control item ",item.Control);
             });

             },
             error: function (e) {
                 alert('Unable to reach the server 251');

             }
        });
}


