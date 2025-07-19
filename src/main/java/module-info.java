module com.example.mystudentwallet {
    requires javafx.controls;
    requires javafx.fxml;
    requires java.sql;
    requires org.controlsfx.controls;

    opens com.example.mystudentwallet to javafx.fxml;
    exports com.example.mystudentwallet;
}