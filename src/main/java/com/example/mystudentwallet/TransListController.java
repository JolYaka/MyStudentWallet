package com.example.mystudentwallet;

import javafx.fxml.FXML;
import java.sql.*;
import javafx.fxml.Initializable;
import javafx.scene.control.Label;
import java.io.IOException;
import java.net.URL;
import java.util.ResourceBundle;

public class TransListController implements Initializable {
    @FXML
    Label descriptionLabel1,descriptionLabel2,descriptionLabel3,descriptionLabel4,dateLabel1,dateLabel2,dateLabel3,dateLabel4,amountLabel1,amountLabel2,amountLabel3,amountLabel4;
    public void initialize (URL location, ResourceBundle resource ){
        setLabel();
        sqlPart();
    }
    private void setLabel(){
        descriptionLabel1.setText("Desciption récente");
        descriptionLabel2.setText("Desciption récente");
        descriptionLabel3.setText("Desciption récente");
        descriptionLabel4.setText("Desciption récente");
        dateLabel1.setText("XXXX-XX-XX");
        dateLabel2.setText("XXXX-XX-XX");
        dateLabel3.setText("XXXX-XX-XX");
        dateLabel4.setText("XXXX-XX-XX");
        amountLabel1.setText("XXXX");
        amountLabel2.setText("XXXX");
        amountLabel3.setText("XXXX");
        amountLabel4.setText("XXXX");
    }
    private void sqlPart(){
        try{
        String url = "jdbc:sqlite:src/main/resources/com/example/mystudentwallet/myStudentWalletBD.db";
        String sql = "SELECT description,amount,date FROM Transactions ORDER BY id DESC LIMIT 4";
        Connection conn = DriverManager.getConnection(url);
        PreparedStatement pstmt= conn.prepareStatement(sql);
        ResultSet rs = pstmt.executeQuery();
        while(rs.next()){
            descriptionLabel1.setText(rs.getString("description"));
            amountLabel1.setText(String.format("%.2f",rs.getDouble("amount")));
            dateLabel1.setText(rs.getString("date"));
        }
        }
        catch(SQLException e){
            System.err.println("Le message d'erreur est:"+e.getMessage());
        }
    }
}
