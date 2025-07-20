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
    Label [] desTab;
    Label [] dateTab;
    Label [] amountTab;
    public void initialize (URL location, ResourceBundle resource ){
        desTab=new Label[]{descriptionLabel1,descriptionLabel2,descriptionLabel3,descriptionLabel4};
        dateTab= new Label[]{dateLabel1,dateLabel2,dateLabel3,dateLabel4};
        amountTab=new Label[]{amountLabel1,amountLabel2,amountLabel3,amountLabel4};
        setLabel();
        sqlPart();
    }
    private void setLabel(){
        for(Label e : desTab)
            e.setText("Desciption récente");
        for(Label e : dateTab)
            e.setText("XXXX-XX-XX");
        for(Label e : amountTab)
            e.setText("XXXX");
    }
    private void sqlPart(){
        try{
        String url = "jdbc:sqlite:src/main/resources/com/example/mystudentwallet/myStudentWalletBD.db";
        String sql = "SELECT description,amount,date FROM Transactions ORDER BY id DESC LIMIT 4";
        Connection conn = DriverManager.getConnection(url);
        PreparedStatement pstmt= conn.prepareStatement(sql);
        ResultSet rs = pstmt.executeQuery();
        int i=0;
        while(rs.next()){
            desTab[i].setText(rs.getString("description"));
            amountTab[i].setText(String.format("%.2f",rs.getDouble("amount")));
            dateTab[i].setText(rs.getString("date"));
            i++;
        }
        conn.close();
        }
        catch(SQLException e){
            System.err.println("Le message d'erreur est:"+e.getMessage());
        }
    }
}
